export function classifyGenre(genre: string): string {
  const g = genre ? genre.trim() : "Other";
  const mapping: Record<string, string[]> = {
    "Fantasy & Sci-Fi": [
      "Fantasy", "Dark Fantasy", "Sci-Fi", "Cyberpunk", "Steampunk", 
      "Dystopian", "Post-Apocalyptic", "Magical Realism", "Alternate History", 
      "Epic Poetry", "Detective Sci-Fi"
    ],
    "Mystery & Thriller": [
      "Mystery", "Thriller", "Crime", "Detective", "Spy Fiction", 
      "Legal Thriller", "Techno-thriller", "Mystery-Thriller", "True Crime"
    ],
    "Non-fiction": [
      "Non-fiction", "Biography", "Autobiography", "Memoir", "Graphic Memoir", 
      "Semi-autobiographical", "Gonzo Journalism", "Feminist Non-fiction"
    ],
    "Horror & Gothic": [
      "Horror", "Gothic", "Gothic Horror", "Historical Horror", "Southern Gothic", "Dark Academia"
    ],
    "Children & YA": [
      "Children's Fiction", "Young Adult", "Coming-of-age", "Bildungsroman", "Fable", "Parable"
    ],
    "Academic & Professional": [
      "Philosophy", "Psychology", "Science", "Economics", "Business", "Finance", "Self-Help"
    ],
    "Historical & War": [
      "Historical Fiction", "History", "War", "Western"
    ],
    "Literature & Arts": [
      "Drama", "Play", "Poetry", "Tragedy", "Epistolary", "Allegory", 
      "Metafiction", "Historiographic Metafiction", "Graphic Novel", "Beat"
    ],
    "Fiction": [
      "Fiction", "Literary Fiction", "Contemporary Fiction", "Short Stories", 
      "Novella", "Realism", "Modernist", "Social Novel", "Transgressive", 
      "Feminist Fiction", "Absurdist", "Picaresque", "Satire", "Humor", "Romance", "Historical Romance"
    ]
  };


  for (const [supergenre, subgenres] of Object.entries(mapping)) {
    if (subgenres.includes(g)) {
      return supergenre;
    }
  }

  return "Other"; 
}