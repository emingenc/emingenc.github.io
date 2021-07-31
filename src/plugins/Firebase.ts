import { Plugin } from "@nuxt/types"

/* Interfaces */
export interface SongMetadata {
  artist?: string | null
  lyrics?: string[] | null
  thumbnail?: string | null
  title?: string | null
}

export interface Song {
  date: Date | null
  url: string | null
  spotifyUrl?: string | null
  metadata: SongMetadata
}

/* Declare modules */
declare module "vue/types/vue" {
  interface Vue {
    $getDaily(limit: number): Promise<Song | Song[]>
  }
}

declare module "@nuxt/types" {
  interface NuxtAppOptions {
    $getDaily(limit: number): Promise<Song | Song[]>
  }

  interface Context {
    $getDaily(limit: number): Promise<Song | Song[]>
  }
}

/* Plugin */
const Firebase: Plugin = ({ $fire }, inject) => {
  /**
   * Fetch the daily song from Firebase.
   * @param {number} [limit=1] The limit of the values to return. If none present, will return one URL in string format.
   * @returns {string|any[]} Either array of the songs or the URL of a song if no limit is given.
   */
  async function getDaily(limit: number = 1): Promise<Song | Song[]> {
    const ref = $fire.firestore.collection("dailySongs")

    const docs: Song[] = []

    await ref
      .where("date", "<=", new Date())
      .orderBy("date", "desc")
      .limit(limit)
      .get()
      .then((snapshots) => {
        snapshots.forEach((snapshot) => {
          const { date, url, metadata, spotifyUrl } = snapshot.data()
          docs.push({ date: date.toDate(), url, metadata, spotifyUrl })
        })
      })

    if (docs.length === 1) return docs[0]
    else if (docs.length > 1) return docs
    else return []
  }

  inject("getDaily", getDaily)
}

export default Firebase
