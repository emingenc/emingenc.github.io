<template>
  <div class="space-y-4 py-8">
    <div>
      <h1 class="text-2xl text-gray-900 dark:text-gray-100">
        Something bad happened...
      </h1>

      <p class="text-lg text-gray-700 dark:text-gray-300">Maybe this'd help:</p>
    </div>

    <div
      class="rounded flex flex-col space-y-4 bg-gray-200 py-2 px-4 whitespace-normal dark:(bg-gray-800 text-gray-200)"
    >
      <div class="flex flex-col">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Title:</h3>
        <code>{{ getErrorMeta.title }}</code>
      </div>

      <div class="flex flex-col">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">
          Description:
        </h3>
        <code>{{ getErrorMeta.description }}</code>
      </div>

      <div class="flex flex-col">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Details:</h3>
        <code>{{ JSON.stringify(error) }}</code>
      </div>
    </div>

    <div class="flex flex-wrap space-x-2">
      <button title="Click to go back" @click="$router.back()">Go Back</button>

      <button title="Click to refresh the page" @click="refresh">
        Refresh Page
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue"

export default Vue.extend({
  layout: "default",
  props: {
    error: {
      type: Object as PropType<{
        title: string
        statusCode: number
        description: string
      }>,
      default: null,
    },
  },
  data() {
    return {
      errors: {
        400: {
          title: "Bad Request",
          description: "Bad, bad request!",
        },
        401: {
          title: "Unauthorized",
          description:
            "This page requires some authorization stuff, or maybe you can't just access this.",
        },
        403: {
          title: "Forbidden",
          description: "Maybe you shouldn't be here!",
        },
        404: {
          title: "Page Not Found",
          description: "Are you sure you entered a right URL?",
        },
        500: {
          title: "Internal Server Error",
          description:
            "Lucky. This is not related to you. It's my fault. Please reach me out so that I can fix this issue.",
        },
      },
    }
  },
  head() {
    return {
      title: `Error ${this.$props.error.statusCode}`,
    }
  },
  computed: {
    /**
     * Checks through the common error object and returns the title-description if exists.
     * @returns {{title: string, description: string}} The object that contains error title and description.
     */
    getErrorMeta(): { title: string; description: string } {
      const statusCode = this.error.statusCode

      return {
        // @ts-ignore-next-line
        title: this.errors[statusCode]?.title || "Unknown",
        // @ts-ignore-next-line
        description: this.errors[statusCode]?.description || "No description.",
      }
    },
  },
  mounted() {
    console.error(this.$props.error)
  },
  methods: {
    /**
     * Refreshes the page.
     */
    refresh() {
      window.location.reload()
    },
  },
})
</script>

<style lang="scss" scoped>
button {
  @apply px-4 py-2 bg-gray-200 rounded text-gray-900 cursor-pointer select-none dark:(bg-gray-700 text-gray-100 hover:bg-gray-800) hover:bg-gray-300 focus:outline-none;
}
</style>
