<template>
  <div
    v-if="$fetchState.pending === false && !$fetchState.error"
    class="grid gap-6 grid-cols-1 sm:grid-cols-2 dark:text-gray-200"
  >
    <div>
      <h4 class="font-medium">Previous Post</h4>

      <SmartLink v-if="prev" :href="`/blog/post/${prev.slug}`">
        <h5>
          {{ prev.title }}
        </h5>
      </SmartLink>

      <h5 v-else class="line-through">No previous post</h5>
    </div>

    <div class="text-right">
      <h4 class="font-medium">Next Post</h4>

      <SmartLink v-if="next" :href="`/blog/post/${next.slug}`">
        <h5>
          {{ next.title }}
        </h5>
      </SmartLink>

      <h5 v-else class="line-through">No next post</h5>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

/* Interfaces */
import type { IContentDocument } from "@nuxt/content/types/content"

interface Post {
  title: string
  slug: string
}

export default Vue.extend({
  props: {
    currentSlug: {
      type: String,
      required: true,
      default: null,
    },
  },
  data() {
    return {
      prev: {} as IContentDocument,
      next: {} as IContentDocument,
    }
  },
  async fetch() {
    const [prev, next] = (await this.$content()
      .only(["title", "slug"])
      .sortBy("createdAt", "asc")
      .surround(this.currentSlug)
      .fetch()) as IContentDocument[]

    this.prev = prev
    this.next = next
  },
})
</script>

<style lang="scss" scoped>
div {
  a {
    @apply hover:underline;
  }

  h4 {
    @apply block text-lg font-medium text-gray-900 dark:text-gray-100;
  }

  h5 {
    @apply text-xl font-light text-gray-700 truncate dark:text-gray-300;
  }
}
</style>
