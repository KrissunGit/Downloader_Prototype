package main

import (
	"database/sql"
	"encoding/json"
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

type Song struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Filename string `json:"filename"`
	Thumb    string `json:"thumb"` 
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

func downloadMP3(link string, fileType string, savePath string) {
	outputTemplate := fmt.Sprintf("%s/%%(extractor)s_%%(id)s.%%(ext)s", savePath)
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

	cmd := exec.Command("yt-dlp", args...)

	//fmt.Printf("Starting download for: %s\n", link)
	err := cmd.Run()
	if err != nil {
		log.Printf("Error executing yt-dlp: %v\n", err)
		return
	}

	//fmt.Println("Download and processing complete!")
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
	metaCmd := exec.Command("yt-dlp", "--print", "%(title)s@@@%(id)s@@@%(album)s@@@%(artist)s@@@%(extractor)s@@@%(playlist_id)s@@@%(playlist_title)s", link)
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
	links := getPlaylistLinks(link)
	pName, err := getPlaylistName(link)
	if err != nil {
		pName = "Unknown Playlist"
	}

	u, _ := url.Parse(link)
	pID := u.Query().Get("list")

	thumbPath := filepath.Join(savePath, "Thumbnails")
	os.MkdirAll(thumbPath, 0755)
	downloadPlaylistThumbnail(link, thumbPath)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 3)

	for _, URL := range links {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(l string, playlistName string) {
			defer wg.Done()
			defer func() { <-semaphore }()
			downloadMP3(l, fileType, savePath)
			saveToDatabase(db, l, fileType, pName, pID)
		}(URL, pName)
	}
	wg.Wait()
	//fmt.Println("All downloads finished!")
}

func getSearchResults(name string, amount int) ([]SearchResult, error) {
	search := fmt.Sprintf("ytsearch%d:%s", amount, name)
	cmd := exec.Command("yt-dlp", "--print", "%(title)s|%(id)s", "--flat-playlist", search)
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
	cmd := exec.Command("yt-dlp", "--get-url", "--flat-playlist", link)
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
	exec.Command("yt-dlp", args...).Run()
}

func getPlaylistName(link string) (string, error) {
	cmd := exec.Command("yt-dlp", "--get-filename", "-o", "%(playlist_title)s", "--playlist-items", "1", link)
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
		SELECT s.id, s.name, s.filename, p.thumbnail_path
		FROM songs s
		JOIN playlist_songs ps ON s.id = ps.song_id
		JOIN playlists p ON ps.playlist_id = p.id
		WHERE p.youtube_id = ?` // Use the string ID here
	rows, err := db.Query(query, youtube_id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var songs []Song
	for rows.Next() {
		var s Song
		if err := rows.Scan(&s.ID, &s.Name, &s.Filename, &s.Thumb); err != nil {
			return nil, err
		}
		songs = append(songs, s)
	}

	if songs == nil {
		return []Song{}, nil
	}
	return songs, nil
}

func main() {
	//videoLink := "https://www.youtube.com/watch?v=3sP8Bq8Zo2k&list=RD3sP8Bq8Zo2k&start_radio=1"
	//videoLink := "https://on.soundcloud.com/V46RY"
	//videoLink := "https://music.youtube.com/playlist?list=OLAK5uy_kIrWgBEyIzs_kgB5n2hj4WyeWqUlYB1A4&si=ZTCv8Dbx4WYwtBP3"
	//videoLink := "https://music.youtube.com/watch?v=u4xspLiuBgI&list=OLAK5uy_mm4iv6KEvT9FgtD8i04sTEx65HwtqzXW8"
	//videoLink := "https://music.youtube.com/playlist?list=PL5sdWzjD9Gm7qMkPH7HIerE7vSJzINbcW&si=Eq_zQhB5PMydaOjs"
	//videoLink := "https://music.youtube.com/playlist?list=PL5sdWzjD9Gm6niUbzpRP93XgHGTv0xCuJ&si=qll-fqAw0uklmDUr"

	ex, _ := os.Executable()
	if strings.Contains(ex, "go-build") {
		ex, _ = os.Getwd()
	}

	dbPath := filepath.Join(ex, "music_library.db")

	db, err := sql.Open("sqlite", dbPath)
	db.SetMaxOpenConns(1)
	if err != nil {
		log.Fatal("Could not open database:", err)
	}
	defer db.Close()

	if err := createSchema(db); err != nil {
		log.Fatal("Could not create schema:", err)
	}

	if len(os.Args) < 2 {
		fmt.Println("Error: No URL provided")
		os.Exit(1)
	}

	if os.Args[1] == "--list" {
		playlists, _ := getAllPlaylists(db)
		jsonData, _ := json.Marshal(playlists)
		fmt.Println(string(jsonData))
		return
	}

	if os.Args[1] == "--songs" && len(os.Args) > 2 {
		targetID := os.Args[2]
		songs, err := getAllSongsInPlaylist(db, targetID)
		log.Printf("ID Requested: %s | Songs found: %d", targetID, len(songs))
		if err != nil {
			fmt.Println("[]")
			os.Exit(1)
		}
		jsonData, _ := json.Marshal(songs)
		fmt.Println(string(jsonData))
		return
	}

	videoLink := os.Args[1]

	fileType := "mp3"
	savePath := "MyMusic"

	if err := os.MkdirAll(savePath, 0755); err != nil {
		log.Fatal("Could not create library folder:", err)
	}

	if checkIfPlaylist(videoLink) {
		downlaodPlaylistAscync(videoLink, fileType, savePath, db)
	} else {
		downloadMP3(videoLink, fileType, savePath)
		saveToDatabase(db, videoLink, fileType, "Single Downloads", "single_downloads_collection")
	}
}
