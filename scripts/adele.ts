import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const BEARER_TOKEN = 'TgH0O1l1Fv3ZhuYpfDiANg88zZmj4awmexX1ehXAM5MONQMrm2Y1qOL1leLLqdZc';
const ARTIST_ID = 2300; // Adele's ID
const BASE_URL = 'https://api.genius.com';
const PER_PAGE = 50; // Maximum allowed per page
const OUTPUT_FILE = path.join(__dirname, '../data/adele-songs.json');

// Types
interface Song {
  id: number;
  title: string;
  url: string;
  full_title: string;
  header_image_url: string;
  release_date?: string;
  primary_artist: {
    id: number;
    name: string;
  };
  [key: string]: any; // For other properties that might be in the response
}

interface ApiResponse {
  meta: {
    status: number;
  };
  response: {
    songs: Song[];
    next_page: number | null;
  };
}

/**
 * Fetches songs for a specific page
 */
async function fetchSongsPage(page: number): Promise<ApiResponse> {
  try {
    const response = await axios.get(`${BASE_URL}/artists/${ARTIST_ID}/songs`, {
      params: {
        per_page: PER_PAGE,
        page,
        sort: 'title' // Default sorting by title
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
    } else {
      console.error('Error fetching songs:', error);
    }
    throw error;
  }
}

/**
 * Fetches all songs for the artist by handling pagination
 */
async function fetchAllSongs(): Promise<Song[]> {
  let allSongs: Song[] = [];
  let currentPage = 1;
  let hasNextPage = true;
  
  console.log('Starting to fetch Adele\'s songs...');
  
  while (hasNextPage) {
    try {
      console.log(`Fetching page ${currentPage}...`);
      const data = await fetchSongsPage(currentPage);
      
      if (data.meta.status === 200) {
        const songs = data.response.songs;
        allSongs = [...allSongs, ...songs];
        console.log(`Retrieved ${songs.length} songs from page ${currentPage}`);
        
        // Check if there are more pages
        hasNextPage = data.response.next_page !== null;
        currentPage = data.response.next_page || currentPage + 1;
      } else {
        console.error('API returned non-200 status:', data.meta.status);
        hasNextPage = false;
      }
    } catch (error) {
      console.error(`Error on page ${currentPage}:`, error);
      hasNextPage = false;
    }
    
    // Add a small delay to avoid rate limiting
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return allSongs;
}

/**
 * Saves the songs to a JSON file
 */
function saveSongsToFile(songs: Song[]): void {
  // Ensure the directory exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(
    OUTPUT_FILE, 
    JSON.stringify(songs, null, 2)
  );
  
  console.log(`Saved ${songs.length} songs to ${OUTPUT_FILE}`);
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    const songs = await fetchAllSongs();
    console.log(`Total songs fetched: ${songs.length}`);
    
    // Save the results to a file
    saveSongsToFile(songs);
    
    // Print some basic stats
    console.log('\nSong Titles:');
    songs.slice(0, 10).forEach((song, index) => {
      console.log(`${index + 1}. ${song.title}`);
    });
    
    if (songs.length > 10) {
      console.log(`... and ${songs.length - 10} more songs`);
    }
  } catch (error) {
    console.error('Failed to fetch Adele\'s songs:', error);
  }
}

// Execute the script
main();