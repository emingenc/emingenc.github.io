<template>
  <nav class="w-full">
    <div class="container mx-auto w-11/12 relative sm:w-9/12 md:w-7/12">
      <div class="flex items-center justify-between">
        <SmartLink :href="{ name: 'index' }" class="flex-shrink-0 ">
          <div class="flex items-center justify-between">
              <SmartImage
                src="/assets/icons/icon.svg"
                class="rounded-md ring-black transition-transform ring-2 ring-opacity-5 sm:transform hover:-rotate-20"
                width="100"
                height="40"
                title="EMIN's Website"
              />
               <p class="rounded py-1 px-2 text-gray-800 dark:(text-teal-400 hover:rotate-10) sm:transform hover:rotate-10">
                 Emin GENCH</p>
          </div>
        </SmartLink>

        <div class="space-x-2 hidden sm:flex sm:items-center">
          <SmartLink
            v-for="(link, index) in getCurrentRouteLinks"
            :key="`link-${index}`"
            :href="link.to"
            class="rounded py-1 px-2 text-gray-800 dark:(text-gray-200 hover:bg-gray-700) hover:bg-gray-100"
          >
            {{ link.title }}
          </SmartLink>
          

          <ColorSwitcher />
        </div>

        <!-- Mobile Navbar -->
        <div class="block sm:hidden">
          <div @click="mobileMenu = !mobileMenu">
            <IconMenu
              class="h-8 text-gray-900 w-8 dark:text-gray-100"
            />
          </div>

          <transition name="fade" mode="out-in">
            <div
              v-show="mobileMenu === true"
              class="rounded-md space-y-4 bg-gray-200 shadow-lg p-4 -top-1 -right-1 -left-1 z-20 absolute dark:bg-gray-800"
            >
              <div
                class="flex text-gray-900 items-center justify-between dark:text-gray-100"
              >
                <h3 class="font-medium text-lg">Menu</h3>

                <div @click="mobileMenu = false">
                  <IconX class="h-6 w-6" />
                </div>
              </div>

              <div class="space-y-2">
                <SmartLink
                  v-for="(link, index) in getCurrentRouteLinks"
                  :key="`link-${index}`"
                  :href="link.to"
                  class="rounded-md flex bg-gray-300 py-2 px-4 text-gray-800 justify-center dark:(bg-gray-700 text-gray-200)"
                >
                  {{ link.title }}
                </SmartLink>
              </div>

              <div class="flex items-center">
                <div
                  class="rounded-tl-md rounded-bl-md flex space-x-2 py-2 text-gray-800 w-1/2 items-center justify-center dark:text-gray-200"
                  :class="{
                    'bg-gray-300 dark:bg-gray-700':
                      getSelectedTheme !== 'light',
                    'bg-gray-400 dark:bg-gray-900':
                      getSelectedTheme === 'light',
                  }"
                  @click="switchTheme('light')"
                >
                  <IconSun class="h-6 w-6" />
                  <span>Light</span>
                </div>

                <div
                  class="rounded-tr-md rounded-br-md flex space-x-2 bg-gray-300 py-2 text-gray-800 w-1/2 items-center justify-center dark:(text-gray-200 bg-gray-700)"
                  :class="{
                    'bg-gray-300 dark:bg-gray-700': getSelectedTheme !== 'dark',
                    'bg-gray-400 dark:bg-gray-900': getSelectedTheme === 'dark',
                  }"
                  @click="switchTheme('dark')"
                >
                  <IconMoon class="h-6 w-6" />
                  <span>Dark</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  data() {
    return {
      mobileMenu: false,
      links: {
        default: [
          {
            title: "Freelance",
            to: "https://www.upwork.com/o/profiles/users/~01dbc331a50d638d39/",
          },
          {
            title: "Blog",
            to: "/blog/",
          },
          {
            title: "Projects",
            to: "/#projects",
          },
          //{
          //  title: "Apps",
          //  to: "/#apps",
          //},
          {
            title: "Donate",
            to: "/donate",
          },
        ],
        premid: [
          {
            title: "Home",
            to: "/projects/premid",
          },
          {
            title: "Custom Status",
            to: "/projects/premid/custom-status",
          },
          {
            title: "Metadata Creator",
            to: "/projects/premid/mdcreator",
          },
        ],
      },
    }
  },
  computed: {
    /**
     * Checks if route has special links and returns the array according to that.
     * @returns {Array.<{title: string; to: string}>}
     */
    getCurrentRouteLinks(): Array<{ title: string; to: string }> {
      if (this.$route.path.startsWith("/projects/premid"))
        return this.links.premid
      else return this.links.default
    },
    /**
     * Returns the selected color mode value.
     * @returns {string} The color mode as "light" or "dark".
     */
    getSelectedTheme(): string {
      return this.$colorMode.value
    },
  },
  methods: {
    /**
     * Updates the color mode value.
     * @param {'light'|'dark'} option The color mode option.
     */
    switchTheme(option: "light" | "dark") {
      this.$colorMode.preference = option
    },
  },
})
</script>
