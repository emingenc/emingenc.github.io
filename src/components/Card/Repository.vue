<template>
  <div
    class="rounded-lg cursor-pointer bg-gray-200 bg-opacity-40 p-4 transition-shadow hover:shadow-md dark:bg-gray-800"
  >
    <div class="flex space-x-1 text-gray-900 items-center dark:text-gray-100">
      <span class="flex-grow space-x-2 truncate">
        {{ name }}
      </span>

      <div class="flex space-x-1 items-center">
        <div class="flex space-x-1 items-center">
          <span>{{ stars }}</span>
          <IconStar filled class="h-6 text-yellow-600 w-6" />
        </div>

        <IconDev :brand="getLanguageIcon" class="h-5 w-5" />
      </div>
    </div>

    <p class="text-gray-700 line-clamp-2 dark:text-gray-300">
      {{ description }}
    </p>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    name: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: false,
      default: null,
    },
    stars: {
      type: [String, Number],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  computed: {
    /**
     * Returns proper name for the language icon.
     * @returns {string}
     */
    getLanguageIcon(): string {
      const icons = {
        Vue: "Vue.js",
      }

      // @ts-ignore-next-line
      return icons[this.language] || this.language
    },
  },
})
</script>
