<template>
  <section id="projects">
      <h2 class="mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        My Apps & Games
      </h2>

      <div class="mt-2 grid gap-2 md:(gap-4 grid-cols-3)">
        <div
          v-for="(project, index) in getProjects.featured"
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
              :description="project.description"
              :image="project.image"
              class="h-full"
            />
          </SmartLink>

          <CardProject
            v-else
            :title="project.title"
            :description="project.description"
            :image="project.image"
            class="h-full"
          />
        </div>
      </div>

      <div class="mt-2 grid gap-2 md:(mt-4 gap-4 grid-cols-2)">
        <SmartLink
          v-for="(project, index) in getProjects.rest"
          :key="`project-rest-${index}`"
          :href="project.to"
        >
          <CardProject
            :title="project.title"
            :description="project.description"
            class="h-full"
          />
        </SmartLink>
      </div>
    </section>
</template>

<script lang="ts">
import Vue from "vue"

interface Project {
  title: string
  description: string
  href?: string
  to?: string
  image?: string
}

export default Vue.extend({
  data() {
    return {
      projects: [
      {
          title: "Pomodoro - Tomato Luck",
          description:
            "Pomodoro app that rewards with luck wheel after pomodoro sessions",
          image: "/assets/images/projects/pomodoro.png",
          href: "https://emingenc.github.io/pomodoro_wheel/",
        },
        {
          title: "Yolov5-face detection",
          description:
            "you can run face_detect.ipynb with voila and detect faces",
          image: "/assets/images/projects/facerecognition_1.jpeg",
          href: "https://github.com/emingenc/yolov5-face",
        },
      ] as Project[],
    }
  },
  
  computed: {
    /**
     * Slices the first three projects and creates an object with them, and the rest.
     * @returns {{featured: Project[], rest: Project[]}} The projects object.
     */
    getProjects(): { featured: Project[]; rest: Project[] } {
      const projects = this.projects

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