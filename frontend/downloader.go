package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	_ "modernc.org/sqlite"
)

var ytdlpExtraArgs []string

func ytDlpCommand(args ...string) *exec.Cmd {
	all := append([]string{}, ytdlpExtraArgs...)
	all = append(all, args...)
	return exec.Command("yt-dlp", all...)
}

type Song struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Filename string `json:"filename"`
	Thumb    string `json:"thumb"`
}

type Video struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Filename string `json:"filename"`
	Thumb    string `json:"thumb"`
}

type VideoPlaylist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Thumb string `json:"thumb"`
}

type Playlist struct {
	ID   int
	Name string
}

type PlaylistSong struct {
	PlaylistID int
	SongID     int
	Position   int
}

type Album struct {
	ID   int
	Name string
}

type Artist struct {
	ID   int
	Name string
}

type SearchResult struct {
	Title string
	ID    string
}

type downloadStatus struct {
	SongID string `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

func emitStatusUpdate(id, title, status string) {
	msg := downloadStatus{SongID: id, Title: title, Status: status}
	bytes, _ := json.Marshal(msg)
	fmt.Println(string(bytes))
}

func createSchema(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        );`,
		`CREATE TABLE IF NOT EXISTS albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        );`,
		`CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
			youtube_id TEXT UNIQUE,
            name TEXT,
			thumbnail_path TEXT,
			extractor TEXT
        );`,
		`CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
			youtube_id TEXT UNIQUE,
            name TEXT,
            filename TEXT,
            album_id INTEGER,
            artist_id INTEGER,
			extractor TEXT,
            UNIQUE(name, artist_id),
            FOREIGN KEY (album_id) REFERENCES albums(id),
            FOREIGN KEY (artist_id) REFERENCES artists(id)
        );`,
		`CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id INTEGER,
            song_id INTEGER,
            position INTEGER,
            PRIMARY KEY (playlist_id, song_id),
            FOREIGN KEY (playlist_id) REFERENCES playlists(id),
            FOREIGN KEY (song_id) REFERENCES songs(id)
        );`,
		`CREATE TABLE IF NOT EXISTS videos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			youtube_id TEXT UNIQUE,
			name TEXT,
			filename TEXT,
			thumbnail_path TEXT,
			extractor TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS video_playlists (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			youtube_id TEXT UNIQUE,
			name TEXT,
			thumbnail_path TEXT,
			exractor TEXT
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("error executing query [%s]: %v", q, err)
		}
	}
	return nil
}

func GetSongsInPlaylist(db *sql.DB, playlistID int) ([]Song, error) {
	query := `
		SELECT s.id, s.name, s.filename
		FROM songs s
		JOIN playlist_songs ps ON s.id = ps.song_id
		WHERE ps.playlist_id = ?
		ORDER by ps.position ASC`

	rows, err := db.Query(query, playlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var songs []Song
	for rows.Next() {
		var s Song
		if err := rows.Scan(&s.ID, &s.Name, &s.Filename); err != nil {
			return nil, err
		}
		songs = append(songs, s)
	}
	return songs, nil
}

func downloadVideo(link string, fileType string, savePath string, quality string) {
	outputTemplate := fmt.Sprintf("%s/%%(extractor)s_%%(id)s.%%(ext)s", savePath)

	var formatSelector string
	switch quality {
	case "1080p":
		formatSelector = "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
	case "720p":
		formatSelector = "bestvideo[height<=720]+bestaudio/best[height<=720]"
	case "480p":
		formatSelector = "bestvideo[height<=480]+bestaudio/best[height<=480]"
	default:
		formatSelector = "bestvideo+bestaudio/best"
	}

	args := []string{
		link,
		"--no-playlist",
		"-o", outputTemplate,
		"--format", formatSelector,
		"--merge-output-format", fileType,
		"--quiet",
	}

	cmd := ytDlpCommand(args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error executing yt-dlp: %v\nOutput: %s\n", err, string(out))
		return
	}
}

func getVideoName(link string) (string, error) {
	cmd := ytDlpCommand("--get-filename", "-o", "%(title)s", link)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	name := strings.TrimSpace(string(out))
	if name == "" || name == "NA" {
		return "Unknown Video", nil
	}
	return removeWeirdCharacters(name), nil
}

func getAllVideosInPlaylist(db *sql.DB, youtube_id string) ([]Video, error) {
	var rows *sql.Rows
	var err error

	// If viewing single collections, grab all videos that don't belong to a real playlist
	if youtube_id == "single_videos_collection" {
		rows, err = db.Query(`SELECT id, name, filename, thumbnail_path FROM videos`)
	} else {
		// Fallback for true playlists if you add a playlist tracking column later
		rows, err = db.Query(`SELECT id, name, filename, thumbnail_path FROM videos WHERE youtube_id = ?`, youtube_id)
	}

	if err != nil {
		return []Video{}, err
	}
	defer rows.Close()

	var videos []Video
	for rows.Next() {
		var v Video
		if err := rows.Scan(&v.ID, &v.Name, &v.Filename, &v.Thumb); err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}

	if videos == nil {
		return []Video{}, nil
	}
	return videos, nil
}

// Pass *sql.DB into the function signature
func downloadVideoPlaylistAsync(link string, fileType string, savePath string, quality string, threadCount int, db *sql.DB) {
	cmd := ytDlpCommand("--flat-playlist", "--print", "%(id)s|||%(title)s", link)
	out, _ := cmd.Output()
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")

	type Job struct {
		ID    string
		Title string
	}

	var jobs []Job
	for _, line := range lines {
		if parts := strings.Split(line, "|||"); len(parts) == 2 {
			job := Job{ID: parts[0], Title: parts[1]}
			jobs = append(jobs, job)
			emitStatusUpdate(job.ID, job.Title, "pending")
		}
	}

	vName, err := getVideoName(link)
	if err != nil {
		vName = "Unknown Video Playlist"
	}

	u, _ := url.Parse(link)
	vID := u.Query().Get("list") // Playlist unique identifiers use "list", not "v"
	if vID == "" {
		vID = "single_videos_collection"
	}

	thumbPath := filepath.Join(savePath, "Thumbnails")
	if err := os.MkdirAll(thumbPath, 0755); err != nil {
		log.Printf("Failed to create thumbnail directory: %v", err)
	}
	downloadVideoThumbnail(link, thumbPath)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, threadCount)

	for _, job := range jobs {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(j Job, videoPlaylistName string, videoPlaylistID string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", j.ID)
			emitStatusUpdate(j.ID, j.Title, "downloading")

			downloadVideo(videoURL, fileType, savePath, quality)
			// FIXED: Using saveToVideoDatabase here
			saveToVideoDatabase(db, videoURL, fileType, videoPlaylistName, videoPlaylistID)
			emitStatusUpdate(j.ID, j.Title, "completed")
		}(job, vName, vID)
	}
	wg.Wait()
}

func saveToVideoDatabase(db *sql.DB, link string, fileType string, videoPlaylistName string, videoPlaylistID string) {
	// 1. Fetch metadata cleanly from yt-dlp
	metaCmd := ytDlpCommand("--print", "%(title)s@@@%(id)s@@@%(extractor)s@@@%(playlist_id)s@@@%(playlist_title)s", link)
	metaOut, _ := metaCmd.Output()
	parts := strings.Split(strings.TrimSpace(string(metaOut)), "@@@")

	if len(parts) < 5 {
		return
	}

	title := parts[0]
	videoIDStr := parts[1]
	extractor := parts[2]
	vPlaylistIDStr := parts[3]
	vPlaylistTitle := parts[4]

	// Swap fallback variables safely when downloading an isolated single video file
	if vPlaylistIDStr == "NA" || vPlaylistIDStr == "" {
		vPlaylistIDStr = videoPlaylistID   // "single_videos_collection"
		vPlaylistTitle = videoPlaylistName // "Single Videos"
	}

	filename := fmt.Sprintf("MyVideos/%s_%s.%s", extractor, videoIDStr, fileType)

	// FIX 1: Explicitly guarantee the "Single Videos" collection container exists FIRST.
	// This runs completely independently so it never gets skipped if video processing hits an error.
	_, err := db.Exec(`
        INSERT INTO video_playlists (youtube_id, name, thumbnail_path, exractor) 
        VALUES (?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO NOTHING`,
		"single_videos_collection", "Single Videos", "MyVideos/Thumbnails/video_default.jpg", "internal")
	if err != nil {
		log.Printf("Error creating default video collection shelf: %v", err)
	}

	// 2. Insert into videos table (Removed RETURNING id to maximize driver compatibility)
	_, err = db.Exec(`
        INSERT INTO videos (youtube_id, name, filename, thumbnail_path, extractor) 
        VALUES (?, ?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO UPDATE SET name=excluded.name`,
		videoIDStr, title, filename, fmt.Sprintf("MyVideos/Thumbnails/%s.jpg", videoIDStr), extractor)

	if err != nil {
		log.Printf("Error tracking video asset record: %v", err)
		return
	}

	// 3. Track actual target playlist if this download belongs to an external set list
	thumbName := fmt.Sprintf("MyVideos/Thumbnails/%s.jpg", vPlaylistIDStr)
	if vPlaylistIDStr == "single_videos_collection" {
		thumbName = "MyVideos/Thumbnails/video_default.jpg"
	}

	// Using exractor to match your table's typo temporary safety layout
	_, err = db.Exec(`
        INSERT INTO video_playlists(youtube_id, name, thumbnail_path, exractor) 
        VALUES(?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO UPDATE SET name=excluded.name, thumbnail_path=excluded.thumbnail_path`,
		vPlaylistIDStr, vPlaylistTitle, thumbName, extractor)

	if err != nil {
		log.Printf("Error matching video array tracking structure: %v", err)
		return
	}
}

func downloadVideoThumbnail(link string, savePath string) {
	outputTemplate := fmt.Sprintf("%s/%%(id)s.%%(ext)s", savePath)

	args := []string{
		link,
		"--playlist-items", "1",
		"--write-thumbnail",
		"--skip-download",
		"--convert-thumbnails", "jpg",
		"-o", outputTemplate,
	}
	ytDlpCommand(args...).Run()
}

func downloadMP3(link string, fileType string, savePath string) {
	outputTemplate := fmt.Sprintf("%s/%%(extractor)s_%%(id)s.%%(ext)s", savePath)
	//outputTemplate := fmt.Sprintf("%s/%%(title)s_%%(id)s.%%(ext)s", savePath)
	args := []string{
		link,
		"--no-playlist",
		"-o", outputTemplate,
		"--format", "bestaudio/best",
		"--quiet",
		"--extract-audio",
		"--audio-format", fileType,
		"--audio-quality", "192K",
		"--convert-thumbnails", "jpg",
		"--embed-thumbnail",
		"--embed-metadata",
		"--download-archive", "downloaded_songs.txt",
		"--post-overwrites",
	}

	cmd := ytDlpCommand(args...)

	//fmt.Printf("Starting download for: %s\n", link)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error executing yt-dlp: %v\nOutput: %s\n", err, string(out))
		return
	}

	//fmt.Println("Download and processing complete!")
}

func getAllVideoPlaylists(db *sql.DB) ([]map[string]interface{}, error) {
	rows, err := db.Query("SELECT youtube_id, name, thumbnail_path FROM video_playlists")
	if err != nil {
		return []map[string]interface{}{}, err // Return empty slice instead of nil
	}
	defer rows.Close()

	// Initialize the slice explicitly so it marshals to [] instead of null
	result := []map[string]interface{}{}

	for rows.Next() {
		var id, name, thumb string
		if err := rows.Scan(&id, &name, &thumb); err != nil {
			return result, err
		}
		result = append(result, map[string]interface{}{
			"id":    id,
			"name":  name,
			"thumb": thumb,
		})
	}
	return result, nil
}

// migrateMyVideoPaths updates any existing DB records that reference the old
// `MyVideo/` path to the new `MyVideos/` folder layout.
func migrateMyVideoPaths(db *sql.DB) error {
	stmts := []string{
		`UPDATE videos SET filename = replace(filename, 'MyVideo/', 'MyVideos/') WHERE filename LIKE 'MyVideo/%'`,
		`UPDATE videos SET thumbnail_path = replace(thumbnail_path, 'MyVideo/', 'MyVideos/') WHERE thumbnail_path LIKE 'MyVideo/%'`,
		`UPDATE video_playlists SET thumbnail_path = replace(thumbnail_path, 'MyVideo/', 'MyVideos/') WHERE thumbnail_path LIKE 'MyVideo/%'`,
		`UPDATE playlists SET thumbnail_path = replace(thumbnail_path, 'MyVideo/', 'MyVideos/') WHERE thumbnail_path LIKE 'MyVideo/%'`,
		`UPDATE songs SET filename = replace(filename, 'MyVideo/', 'MyVideos/') WHERE filename LIKE 'MyVideo/%'`,
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()

	for _, s := range stmts {
		if _, err = tx.Exec(s); err != nil {
			return err
		}
	}

	log.Println("Migration: converted MyVideo/ paths to MyVideos/ where applicable")
	return nil
}

func getAllPlaylists(db *sql.DB) ([]map[string]interface{}, error) {
	rows, err := db.Query("SELECT youtube_id, name, thumbnail_path FROM playlists")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var id, name, thumb string
		rows.Scan(&id, &name, &thumb)
		result = append(result, map[string]interface{}{
			"id":    id,
			"name":  name,
			"thumb": thumb,
		})
	}
	return result, nil
}

func saveToDatabase(db *sql.DB, link string, fileType string, playlistName string, playlistID string) {
	metaCmd := ytDlpCommand("--print", "%(title)s@@@%(id)s@@@%(album)s@@@%(artist)s@@@%(extractor)s@@@%(playlist_id)s@@@%(playlist_title)s", link)
	metaOut, _ := metaCmd.Output()
	parts := strings.Split(strings.TrimSpace(string(metaOut)), "@@@")

	if len(parts) < 7 {
		return
	}

	title := parts[0]
	songIDStr := parts[1]
	albumName := parts[2]
	artistName := parts[3]
	extractor := parts[4]
	pIDStr := playlistID
	pTitle := playlistName

	if artistName == "NA" || artistName == "" {
		artistName = "Unknown Artist"
	}
	if albumName == "NA" || albumName == "" {
		albumName = "Unknown Album"
	}

	if pIDStr == "NA" || pIDStr == "" {
		pIDStr = playlistID
		pTitle = playlistName
	}

	filename := fmt.Sprintf("%s_%s.%s", extractor, songIDStr, fileType)

	var artistID int64
	db.QueryRow("INSERT INTO artists(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id", artistName).Scan(&artistID)

	var albumID int64
	db.QueryRow("INSERT INTO albums(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id", albumName).Scan(&albumID)

	var songID int64
	err := db.QueryRow(`
        INSERT INTO songs (youtube_id, name, filename, album_id, artist_id, extractor) 
        VALUES (?, ?, ?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO UPDATE SET name=excluded.name 
        RETURNING id`,
		songIDStr, title, filename, albumID, artistID, extractor).Scan(&songID)

	if err != nil {
		log.Printf("Error inserting song: %v", err)
	}

	thumbName := fmt.Sprintf("Thumbnails/%s.jpg", pIDStr)

	var pTableID int64
	db.QueryRow(`
        INSERT INTO playlists(youtube_id, name, thumbnail_path, extractor) 
        VALUES(?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO UPDATE SET name=excluded.name, thumbnail_path=excluded.thumbnail_path
        RETURNING id`,
		pIDStr, pTitle, thumbName, extractor).Scan(&pTableID)

	db.Exec(`INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, pTableID, songID)

	//fmt.Printf("Saved to DB: [%s] %s\n", extractor, title)

	if pIDStr != "single_downloads_collection" {
		var singleCollID int64
		db.QueryRow(`
        INSERT INTO playlists(youtube_id, name, thumbnail_path, extractor) 
        VALUES(?, ?, ?, ?) 
        ON CONFLICT(youtube_id) DO UPDATE SET name=name
        RETURNING id`,
			"single_downloads_collection", "Single Downloads", "Thumbnails/1.jpg", "internal").Scan(&singleCollID)

		db.Exec(`INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, singleCollID, songID)
	}
}

func downlaodPlaylistAscync(link string, fileType string, savePath string, db *sql.DB) {
	// 1. Fetch playlist metadata (ID and Title) cleanly in a single execution
	cmd := ytDlpCommand("--flat-playlist", "--print", "%(id)s|||%(title)s", link)
	out, _ := cmd.Output()
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")

	type Job struct {
		ID    string
		Title string
	}

	var jobs []Job
	for _, line := range lines {
		if parts := strings.Split(line, "|||"); len(parts) == 2 {
			job := Job{ID: parts[0], Title: parts[1]}
			jobs = append(jobs, job) // FIXED: Added missing second argument

			// Notify frontend that this song is officially waiting in line
			emitStatusUpdate(job.ID, job.Title, "pending")
		}
	}

	// 2. Extract metadata for database association
	pName, err := getPlaylistName(link)
	if err != nil {
		pName = "Unknown Playlist"
	}

	u, _ := url.Parse(link)
	pID := u.Query().Get("list")

	// 3. Handle Cover Art/Thumbnails
	thumbPath := filepath.Join(savePath, "Thumbnails")
	if err := os.MkdirAll(thumbPath, 0755); err != nil {
		log.Printf("Failed to create thumbnail directory: %v", err)
	}
	downloadPlaylistThumbnail(link, thumbPath)

	// 4. Thread-Safe Concurrency Processing
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 3)

	// Loop through our structured jobs instead of un-tracked raw URLs
	for _, job := range jobs {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(j Job, playlistName string, playlistID string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			songURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", j.ID)

			emitStatusUpdate(j.ID, j.Title, "downloading")

			downloadMP3(songURL, fileType, savePath)
			saveToDatabase(db, songURL, fileType, playlistName, playlistID)

			emitStatusUpdate(j.ID, j.Title, "completed")
		}(job, pName, pID)
	}
	wg.Wait()
}
func getSearchResults(name string, amount int) ([]SearchResult, error) {
	search := fmt.Sprintf("ytsearch%d:%s", amount, name)
	cmd := ytDlpCommand("--print", "%(title)s|%(id)s", "--flat-playlist", search)
	cmdOut, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("Failed to execute yt-dlp: %w", err)
	}
	lines := strings.Split(strings.TrimSpace(string(cmdOut)), "\n")
	var result []SearchResult

	for _, line := range lines {
		parts := strings.Split(line, "|")
		if len(parts) == 2 {
			result = append(result, SearchResult{
				Title: parts[0],
				ID:    parts[1],
			})
		}
	}
	return result, nil
}

func checkIfPlaylist(link string) bool {
	return strings.Contains(link, "playlist") || strings.Contains(link, "/sets/")
}

func getPlaylistLinks(link string) []string {
	cmd := ytDlpCommand("--get-url", "--flat-playlist", link)
	out, _ := cmd.Output()

	rawLinks := strings.Split(strings.TrimSpace(string(out)), "\n")
	var links []string
	for _, id := range rawLinks {
		if id != "" {
			links = append(links, id)
		}
	}
	return links
}

func downloadPlaylistThumbnail(link string, savePath string) {
	outputTemplate := fmt.Sprintf("%s/%%(playlist_id)s.%%(ext)s", savePath)

	args := []string{
		link,
		"--playlist-items", "1",
		"--write-thumbnail",
		"--skip-download",
		"--convert-thumbnails", "jpg",
		"-o", outputTemplate,
	}
	ytDlpCommand(args...).Run()
}

func getPlaylistName(link string) (string, error) {
	cmd := ytDlpCommand("--get-filename", "-o", "%(playlist_title)s", "--playlist-items", "1", link)
	out, err := cmd.Output()
	if err != nil {
		fmt.Println("Error getting playlist name")
		return "", err
	}
	name := strings.TrimSpace(string(out))
	if name == "" || name == "NA" {
		return "Unknown Playlist", nil
	}
	return removeWeirdCharacters(string(out)), nil
}

func removeWeirdCharacters(name string) string {
	trimmedName := strings.TrimSpace(string(name))
	replacer := strings.NewReplacer(
		"<", "",
		">", "",
		":", "",
		"\"", "",
		"/", "",
		"\\", "",
		"|", "",
		"?", "",
		"*", "",
		"…", "",
		"...", "",
	)
	return replacer.Replace(trimmedName)
}

func getAllSongsInPlaylist(db *sql.DB, youtube_id string) ([]Song, error) {
	query := `
		SELECT s.id, s.name, s.filename
		FROM songs s
		JOIN playlist_songs ps ON s.id = ps.song_id
		JOIN playlists p ON ps.playlist_id = p.id
		WHERE p.youtube_id = ?`
	rows, err := db.Query(query, youtube_id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var songs []Song
	for rows.Next() {
		var s Song
		// Do not populate s.Thumb here; let the renderer extract embedded artwork
		if err := rows.Scan(&s.ID, &s.Name, &s.Filename); err != nil {
			return nil, err
		}
		s.Thumb = ""
		songs = append(songs, s)
	}

	if songs == nil {
		return []Song{}, nil
	}
	return songs, nil
}

func main() {
	// 1. Explicitly register ALL possible CLI flags so the parser accepts them
	cookies := flag.String("cookies", "", "path to cookies.txt for yt-dlp")
	cookiesFromBrowser := flag.String("cookies-from-browser", "", "browser name to load cookies from (eg. chrome, firefox)")

	// Register video quality flag. If set (e.g. --video 1080p), it acts as video mode
	videoQuality := flag.String("video", "", "Download in video mode with specified quality (e.g., 1080p, 720p)")

	requestedFormat := flag.String("format", "", "Specify taget file extension profile")

	isListCmd := flag.Bool("list", false, "Output all downloaded playlists as JSON")
	isSongsCmd := flag.Bool("songs", false, "Output songs in a specific playlist (requires playlist ID)")

	deletePlaylistCmd := flag.Bool("delete-playlist", false, "Delete a playlist by ID (requires playlist ID)")
	renamePlaylistCmd := flag.Bool("rename-playlist", false, "Rename a playlist by ID (requires playlist ID and new name)")
	migrateCmd := flag.Bool("migrate", false, "Run migration to update MyVideo/ -> MyVideos/ paths and exit")

	flag.Parse()

	// 2. Open / Setup Database
	ex, _ := os.Executable()
	if strings.Contains(ex, "go-build") {
		ex, _ = os.Getwd()
	}
	dbPath := filepath.Join(ex, "data.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal("Could not open database:", err)
	}
	db.SetMaxOpenConns(1)
	defer db.Close()

	if err := createSchema(db); err != nil {
		log.Fatal("Could not create schema:", err)
	}

	// Run migration to rename any existing MyVideo/ paths to MyVideos/
	if err := migrateMyVideoPaths(db); err != nil {
		log.Printf("Warning: failed to run MyVideo->MyVideos migration: %v", err)
	}

	if *renamePlaylistCmd {
		remainingArgs := flag.Args()
		if len(remainingArgs) < 2 {
			fmt.Println("Error: Not enough arguments for renaming. Provide playlist ID and new name.")
			os.Exit(1)
		}
		targetID := remainingArgs[0]
		newName := remainingArgs[1]

		res, err := db.Exec("UPDATE playlists SET name = ? WHERE youtube_id = ?", newName, targetID)
		if rows, _ := res.RowsAffected(); rows == 0 || err != nil {
			_, err = db.Exec("UPDATE video_playlists SET name = ? WHERE youtube_id = ?", newName, targetID)
		}

		if err != nil {
			fmt.Printf("Error renaming playlist with ID %s: %v\n", targetID, err)
			os.Exit(1)
		}
		fmt.Printf("Playlist with ID %s renamed successfully to '%s'.\n", targetID, newName)
		return
	}

	if *deletePlaylistCmd {
		remainingArgs := flag.Args()
		if len(remainingArgs) < 1 {
			fmt.Println("Error: No playlist ID provided for deletion")
			os.Exit(1)
		}
		targetID := remainingArgs[0]

		db.Exec("DELETE FROM playlists WHERE youtube_id = ?", targetID)
		_, err := db.Exec("DELETE FROM video_playlists WHERE youtube_id = ?", targetID)

		if err != nil {
			fmt.Printf("Error deleting playlist with ID %s: %v\n", targetID, err)
			os.Exit(1)
		}
		fmt.Printf("Playlist with ID %s deleted successfully.\n", targetID)
		return
	}

	if *isListCmd {
		audioLists, _ := getAllPlaylists(db)
		videoLists, _ := getAllVideoPlaylists(db)

		combined := map[string]interface{}{
			"audio": audioLists,
			"video": videoLists,
		}

		jsonData, _ := json.Marshal(combined)
		fmt.Println(string(jsonData))
		return
	}

	if *migrateCmd {
		if err := migrateMyVideoPaths(db); err != nil {
			fmt.Printf("Migration failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Migration completed successfully.")
		return
	}

	if *isSongsCmd {
		remainingArgs := flag.Args()
		if len(remainingArgs) < 1 {
			fmt.Println("[]")
			os.Exit(1)
		}
		targetID := remainingArgs[0]

		songs, err := getAllSongsInPlaylist(db, targetID)
		if err != nil || len(songs) == 0 {
			videos, err := getAllVideosInPlaylist(db, targetID)
			if err == nil && len(videos) > 0 {
				jsonData, _ := json.Marshal(videos)
				fmt.Println(string(jsonData))
				return
			}
		}

		jsonData, _ := json.Marshal(songs)
		fmt.Println(string(jsonData))
		return
	}

	// 4. Fallback: Parse remaining target as download URL processing context
	remainingArgs := flag.Args()
	if len(remainingArgs) < 1 {
		fmt.Println("Error: No URL provided")
		os.Exit(1)
	}

	if *cookies != "" {
		ytdlpExtraArgs = append(ytdlpExtraArgs, "--cookies", *cookies)
	}
	if *cookiesFromBrowser != "" {
		ytdlpExtraArgs = append(ytdlpExtraArgs, "--cookies-from-browser", *cookiesFromBrowser)
	}

	videoLink := remainingArgs[0]
	if strings.Contains(videoLink, "music.youtube.com") {
		videoLink = strings.Replace(videoLink, "music.youtube.com", "www.youtube.com", 1)
	}

	// 5. Dynamic Filetype and Path Assignment Block
	var fileType string
	var savePath string

	if *videoQuality != "" {
		// --- VIDEO WORKFLOW PIPELINE ---
		fileType = "mp4"
		if *requestedFormat != "" {
			fileType = *requestedFormat
		}

		savePath = "MyVideos"

		if err := os.MkdirAll(savePath, 0755); err != nil {
			log.Fatal("Could not create video library folder:", err)
		}

		if checkIfPlaylist(videoLink) {
			downloadVideoPlaylistAsync(videoLink, fileType, savePath, *videoQuality, 3, db)
		} else {
			emitStatusUpdate("single", "Video", "downloading")
			downloadVideo(videoLink, fileType, savePath, *videoQuality)
			saveToVideoDatabase(db, videoLink, fileType, "Single Videos", "single_videos_collection")
			emitStatusUpdate("single", "Video", "completed")
		}
	} else {
		// --- AUDIO WORKFLOW PIPELINE ---
		savePath = "MyMusic"

		fileType = "mp3"
		if *requestedFormat != "" {
			fileType = *requestedFormat
		}

		if err := os.MkdirAll(savePath, 0755); err != nil {
			log.Fatal("Could not create music library folder:", err)
		}

		if checkIfPlaylist(videoLink) {
			downlaodPlaylistAscync(videoLink, fileType, savePath, db)
		} else {
			downloadMP3(videoLink, fileType, savePath)
			saveToDatabase(db, videoLink, fileType, "Single Downloads", "single_downloads_collection")
		}
	}
}
