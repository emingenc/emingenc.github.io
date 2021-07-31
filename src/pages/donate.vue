<template>
  <div class="py-4">
    <div class="space-y-6 sm:w-9/12">
      <header class="space-y-4">
        <div class="space-y-1">
          <h1
            class="font-semibold text-2xl text-gray-900 sm:text-3xl dark:text-gray-100"
          >
            Donate
          </h1>

          <div class="space-y-2 text-gray-800 dark:text-gray-200">
            <p>
              If you like my projects and/or what I do and you want to
              contribute, make me happy, you can donate to me with the
              information on this page! Thank you ♥
            </p>

            <p>
              <small class="text-sm">
                P.S. Use the name "Emin Genc" on your transactions.
              </small>
            </p>
          </div>
        </div>
      </header>

      <section class="space-y-4">
        <h2 class="text-lg text-gray-900 dark:text-gray-100">Support Me On</h2>

        <div class="grid gap-4">
          <SmartLink :href="getSponsorLinks.buymeacoffee" class="w-max" blank>
            <div
              class="rounded cursor-pointer flex space-x-2 bg-[#FFDD00] py-2 px-4 items-center hover:bg-opacity-95"
            >
              <SmartImage
                src="/assets/images/bmc.png"
                class="rounded h-7 w-7"
              />
              <span class="text-black">Buy me a coffee</span>
            </div>
          </SmartLink>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg text-gray-900 dark:text-gray-100">My Accounts</h2>

        <div class="grid gap-4">
          <div
            v-for="(account, index) in accounts"
            :key="`account-${index}`"
            class="flex h-full items-center"
          >
            <div class="rounded-tl rounded-bl bg-gray-300 dark:bg-gray-800">
              <SmartImage :src="account.image" class="h-24 w-24" />
            </div>

            <div
              class="rounded-tr rounded-br flex h-full bg-gray-200 w-full pl-4 items-center dark:bg-gray-700"
            >
              <div>
                <h3 class="font-medium text-gray-900 dark:text-gray-100">
                  {{ account.name }}
                </h3>

                <span
                  v-if="account.revealed == true"
                  class="text-gray-800 dark:text-gray-200"
                >
                  {{ account.iban }}
                </span>

                <span
                  v-else
                  class="cursor-pointer text-gray-800 underline dark:text-gray-200"
                  @click="account.revealed = true"
                >
                  Click to reveal
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

/* Interfaces */
import type { Sponsor } from "~/@types/runtimeConfig"

export default Vue.extend({
  data() {
    return {
      accounts: [
        {
          image: "/assets/images/garanti.png",
          name: "Garanti Bankası",
          iban: "TR 7200 0620 0008 20000685 3326",
          revealed: false,
        },
        {
          image: "https://i.vgy.me/R0Jwqn.png",
          name: "Papara",
          iban: "2018126806",
          revealed: false,
        },
      ],
    }
  },
  head() {
    const title = "Donate"
    const description =
      "Like my projects? You can donate to me to boost my performance and help me create more, better projects in the future!"

    return {
      title,
      meta: this.$prepareMeta({
        title,
        description,
        keywords: "donate",
        url: "https://www.buymeacoffee.com/emingenc",
      }),
      link: [
        {
          rel: "canonical",
          href: "https://www.buymeacoffee.com/emingenc",
        },
      ],
    }
  },
  computed: {
    /**
     * Returns the Sponsor object in runtime config.
     * @returns {Sponsor}
     */
    getSponsorLinks(): Sponsor {
      const sponsor = this.$config.sponsor as Sponsor
      return sponsor
    },
  },
})
</script>
