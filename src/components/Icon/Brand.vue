<template>
  <!-- Discord -->
  <svg
    v-if="isSame('Discord')"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 512 512"
  >
    <path
      d="M464 66.52A50 50 0 00414.12 17L97.64 16A49.65 49.65 0 0048 65.52V392c0 27.3 22.28 48 49.64 48H368l-13-44 109 100zM324.65 329.81s-8.72-10.39-16-19.32C340.39 301.55 352.5 282 352.5 282a139 139 0 01-27.85 14.25 173.31 173.31 0 01-35.11 10.39 170.05 170.05 0 01-62.72-.24 184.45 184.45 0 01-35.59-10.4 141.46 141.46 0 01-17.68-8.21c-.73-.48-1.45-.72-2.18-1.21-.49-.24-.73-.48-1-.48-4.36-2.42-6.78-4.11-6.78-4.11s11.62 19.09 42.38 28.26c-7.27 9.18-16.23 19.81-16.23 19.81-53.51-1.69-73.85-36.47-73.85-36.47 0-77.06 34.87-139.62 34.87-139.62 34.87-25.85 67.8-25.12 67.8-25.12l2.42 2.9c-43.59 12.32-63.44 31.4-63.44 31.4s5.32-2.9 14.28-6.77c25.91-11.35 46.5-14.25 55-15.21a24 24 0 014.12-.49 205.62 205.62 0 0148.91-.48 201.62 201.62 0 0172.89 22.95s-19.13-18.15-60.3-30.45l3.39-3.86s33.17-.73 67.81 25.16c0 0 34.87 62.56 34.87 139.62 0-.28-20.35 34.5-73.86 36.19z"
    />
    <path
      d="M212.05 218c-13.8 0-24.7 11.84-24.7 26.57s11.14 26.57 24.7 26.57c13.8 0 24.7-11.83 24.7-26.57.25-14.76-10.9-26.57-24.7-26.57zm88.38 0c-13.8 0-24.7 11.84-24.7 26.57s11.14 26.57 24.7 26.57c13.81 0 24.7-11.83 24.7-26.57S314 218 300.43 218z"
    />
  </svg>

  <!-- YouTube -->
  <svg
    v-else-if="isSame('YouTube')"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18.576 5.91a2.117 2.117 0 00-.58-.954 2.276 2.276 0 00-1.002-.552c-1.388-.36-6.971-.36-6.971-.36s-5.584.01-6.97.37a2.276 2.276 0 00-1.003.553 2.117 2.117 0 00-.58.953c-.42 2.346-.582 5.92.012 8.171.102.36.302.69.58.953.277.264.623.455 1.002.552 1.387.36 6.97.36 6.97.36s5.584 0 6.971-.36a2.276 2.276 0 001.002-.552c.278-.264.478-.593.58-.953.443-2.349.58-5.92-.011-8.182z"
      fill="red"
    />
    <path d="M8.246 12.553L12.878 10 8.246 7.447v5.106z" fill="#fff" />
  </svg>

  <!-- WhatsApp -->
  <svg
    v-else-if="isSame('WhatsApp')"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 512 512"
  >
    <path
      d="M414.73 97.1A222.14 222.14 0 00256.94 32C134 32 33.92 131.58 33.87 254a220.61 220.61 0 0029.78 111L32 480l118.25-30.87a223.63 223.63 0 00106.6 27h.09c122.93 0 223-99.59 223.06-222A220.18 220.18 0 00414.73 97.1zM256.94 438.66h-.08a185.75 185.75 0 01-94.36-25.72l-6.77-4-70.17 18.32 18.73-68.09-4.41-7A183.46 183.46 0 0171.53 254c0-101.73 83.21-184.5 185.48-184.5a185 185 0 01185.33 184.64c-.04 101.74-83.21 184.52-185.4 184.52zm101.69-138.19c-5.57-2.78-33-16.2-38.08-18.05s-8.83-2.78-12.54 2.78-14.4 18-17.65 21.75-6.5 4.16-12.07 1.38-23.54-8.63-44.83-27.53c-16.57-14.71-27.75-32.87-31-38.42s-.35-8.56 2.44-11.32c2.51-2.49 5.57-6.48 8.36-9.72s3.72-5.56 5.57-9.26.93-6.94-.46-9.71-12.54-30.08-17.18-41.19c-4.53-10.82-9.12-9.35-12.54-9.52-3.25-.16-7-.2-10.69-.2a20.53 20.53 0 00-14.86 6.94c-5.11 5.56-19.51 19-19.51 46.28s20 53.68 22.76 57.38 39.3 59.73 95.21 83.76a323.11 323.11 0 0031.78 11.68c13.35 4.22 25.5 3.63 35.1 2.2 10.71-1.59 33-13.42 37.63-26.38s4.64-24.06 3.25-26.37-5.11-3.71-10.69-6.48z"
      fill-rule="evenodd"
    />
  </svg>

  <!-- Twitter -->
  <svg
    v-else-if="isSame('Twitter')"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
  >
    <path
      d="M496 109.5a201.8 201.8 0 01-56.55 15.3 97.51 97.51 0 0043.33-53.6 197.74 197.74 0 01-62.56 23.5A99.14 99.14 0 00348.31 64c-54.42 0-98.46 43.4-98.46 96.9a93.21 93.21 0 002.54 22.1 280.7 280.7 0 01-203-101.3A95.69 95.69 0 0036 130.4c0 33.6 17.53 63.3 44 80.7A97.5 97.5 0 0135.22 199v1.2c0 47 34 86.1 79 95a100.76 100.76 0 01-25.94 3.4 94.38 94.38 0 01-18.51-1.8c12.51 38.5 48.92 66.5 92.05 67.3A199.59 199.59 0 0139.5 405.6a203 203 0 01-23.5-1.4A278.68 278.68 0 00166.74 448c181.36 0 280.44-147.7 280.44-275.8 0-4.2-.11-8.4-.31-12.5A198.48 198.48 0 00496 109.5z"
      fill="currentColor"
    />
  </svg>

  <!-- Instagram -->
  <svg
    v-else-if="isSame('Instagram')"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
  >
    <path
      d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z"
      fill="currentColor"
    />
    <path
      d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z"
      fill="currentColor"
    />
  </svg>

  <!-- Telegram -->
  <svg
    v-else-if="isSame('Telegram')"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 1C5.926 1 1 5.924 1 12c0 6.075 4.926 11 11 11 6.075 0 11-4.925 11-11 0-6.076-4.925-11-11-11zm2.955 16.382a.638.638 0 00.592.078.622.622 0 00.387-.45c.465-2.184 1.593-7.711 2.015-9.697a.42.42 0 00-.341-.501.43.43 0 00-.224.02c-2.242.83-9.147 3.42-11.97 4.465a.444.444 0 00-.289.428.443.443 0 00.317.408c1.266.379 2.927.906 2.927.906s.777 2.344 1.18 3.536a.47.47 0 00.323.308.462.462 0 00.435-.11l1.654-1.563s1.91 1.4 2.994 2.172zm-5.887-4.64l.898 2.961.2-1.875 5.446-4.912a.15.15 0 00-.077-.257.151.151 0 00-.107.022l-6.36 4.06z"
      fill="currentColor"
    />
  </svg>

  <!-- Trello -->
  <svg
    v-else-if="isSame('Trello')"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <rect x="7" y="7" width="3" height="9"></rect>
    <rect x="14" y="7" width="3" height="5"></rect>
  </svg>

  <!-- GitHub -->
  <svg
    v-else-if="isSame('GitHub')"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
  >
    <path
      d="M256 32C132.3 32 32 134.9 32 261.7c0 101.5 64.2 187.5 153.2 217.9a17.56 17.56 0 003.8.4c8.3 0 11.5-6.1 11.5-11.4 0-5.5-.2-19.9-.3-39.1a102.4 102.4 0 01-22.6 2.7c-43.1 0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1 1.4-14.1h.1c22.5 2 34.3 23.8 34.3 23.8 11.2 19.6 26.2 25.1 39.6 25.1a63 63 0 0025.6-6c2-14.8 7.8-24.9 14.2-30.7-49.7-5.8-102-25.5-102-113.5 0-25.1 8.7-45.6 23-61.6-2.3-5.8-10-29.2 2.2-60.8a18.64 18.64 0 015-.5c8.1 0 26.4 3.1 56.6 24.1a208.21 208.21 0 01112.2 0c30.2-21 48.5-24.1 56.6-24.1a18.64 18.64 0 015 .5c12.2 31.6 4.5 55 2.2 60.8 14.3 16.1 23 36.6 23 61.6 0 88.2-52.4 107.6-102.3 113.3 8 7.1 15.2 21.1 15.2 42.5 0 30.7-.3 55.5-.3 63 0 5.4 3.1 11.5 11.4 11.5a19.35 19.35 0 004-.4C415.9 449.2 480 363.1 480 261.7 480 134.9 379.7 32 256 32z"
      fill="currentColor"
    />
  </svg>

  <!-- Spotify -->
  <svg
    v-else-if="isSame('Spotify')"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 1a9 9 0 100 18 9 9 0 000-18zm4.127 12.98a.56.56 0 01-.771.187c-2.114-1.291-4.774-1.583-7.906-.868a.561.561 0 01-.25-1.094c3.428-.783 6.369-.446 8.741 1.004a.561.561 0 01.186.772zm1.102-2.45a.701.701 0 01-.965.231c-2.42-1.487-6.107-1.917-8.968-1.049a.703.703 0 01-.408-1.342c3.268-.992 7.332-.512 10.11 1.196.33.203.434.634.23.964zm.094-2.552c-2.9-1.723-7.686-1.881-10.455-1.04a.842.842 0 11-.489-1.612c3.18-.965 8.464-.778 11.804 1.204a.84.84 0 11-.86 1.448z"
      fill="#1DB954"
    />
  </svg>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    brand: {
      type: String,
      required: true,
      default: "",
    },
  },
  methods: {
    /**
     * Checks if passed value matches with the prop value.
     * @prop {string} value
     * @returns {boolean}
     */
    isSame(value: string): boolean {
      return this.brand?.toLowerCase() === value?.toLowerCase()
    },
  },
})
</script>
