<template>
  <section v-if="apps" id="apps">
      <h2 class="mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        My Apps & Games
      </h2>
      <div class="mt-2 grid gap-2 md:(gap-4 grid-cols-3)">
        <div
          v-for="(project, index) in apps"
          :key="`project-featured-${index}`"
        >
          <SmartLink
            v-if="project.to || project.href"
            :href="project.to || project.href"
            title="Click to visit this project"
            :blank="!!project.href"
          >
            <CardProject
              :title="project.title"
              :image="project.image"
              class="h-full"
            />

          </SmartLink>
         
        </div>
      </div>
    </section>
</template>

<script lang="ts">
import Vue from "vue"
import axios from "axios"
import cheerio from "cheerio"

interface App {
  title: string
  description: string
  href?: string
  to?: string
  image?: string
}
    



export default Vue.extend({
  data() {
    return {
      apps: null
    }
  },
  async fetch(){
      
    async function fetchHTML(url : string) {
     const { data } = await axios.get(
        url,{
          headers: {
            "authority": "play.google.com",
            "cache-control": "max-age=0",
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"91\", \"Chromium\";v=\"91\"",
            "sec-ch-ua-mobile": "?0",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "x-client-data": "CLO1yQEIjbbJAQiktskBCMS2yQEIqZ3KAQiPucoBCJ2MywEIjJ7LAQigoMsBCNzyywEI7/LLAQjO9ssBCLP4ywEInvnLAQjw+csBCI/6ywEIr/rLAQjv+ssBGLryywEYj/XLAQ==",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document",
        }
        }
      )
      return cheerio.load(data)
    }
    const $ = await fetchHTML("https://play.google.com/store/apps/developer?id=emdiapps")

    let appItems = []
    $('div[class="ImZGtf mpg5gc"]').each(function (i: any, e:any) {
        let app = $(this );
        let img = app.children().find('img').attr('data-src')
        let appUrl = "https://play.google.com" + app.children().find('a').attr('href')
        let title = app.children().find('.WsMG1c').text()
        let description = app.children().find('.b8cIId').text()
        appItems[i]  = {
              "title" : title,
              "description" : description,
              "image" : img,
              "href" : appUrl,
        }
    });
    this.apps = appItems ? appItems : null
    

  },
  
  computed: {
    /**
     * Slices the first three projects and creates an object with them, and the rest.
     * @returns {{featured: Project[], rest: Project[]}} The projects object.
     */
    getProjects(): { featured: App[]; rest: App[] } {
      const projects = this.apps

      return {
        featured: projects?.slice(0, 3) || [],
        rest: projects?.slice(3) || [],
      }
    },
  },
})

</script>

<style>

</style>