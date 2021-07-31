<template>
  <div>
    <header class="flex flex-col-reverse py-24 md:(items-center flex-row)">
      <div class="md:w-8/12">
        <div class="space-y-px">
          <div
            class="text-2xl font-semibold text-gray-900 md:text-3xl md:text-4xl dark:text-gray-100"
          >
            <h1>Self taught</h1>
            <h1><span class="text-blue-600">Full-stack</span> Developer</h1>
          </div>

          <p class="text-gray-800 dark:text-gray-200">
            Hello, my name is Emin, I am a self
            taught developer.
            <SmartLink href="https://pytorch.org/" class="description-link" blank>
              Deep Learning </SmartLink
            >,
            <SmartLink
              href="https://nuxtjs.org/"
              class="description-link"
              blank
            >
              Nuxt.js</SmartLink
            >
            and
            <SmartLink
              href="https://www.djangoproject.com/"
              class="description-link"
              blank
            >
              Django</SmartLink
            >.
          </p>
        </div>

        <Status class="mt-2" />
      </div>

      <div class="flex flex-shrink-0 mb-8 md:(justify-end mb-0 w-4/12)">
        <SmartImage
          src="/assets/images/pp.jpeg"
          class="rounded-full h-40 ring-black ring-4 ring-opacity-5 w-40 dark:(ring-white ring-opacity-5)"
        />
      </div>
    </header>

    <section id="projects">
      <h2 class="mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Projects I currently work on
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

    <section
      id="experiences"
      class="mt-4 grid gap-6 sm:mt-6 md:(md:mt-10 gap-8 grid-cols-2)"
    >
      <div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Experience
        </h3>

        <div class="grid gap-2 mt-4">
          <CardExperience
            v-for="(experience, index) in experiences.jobs"
            :key="`experience-job-${index}`"
            :title="experience.title"
            :url="experience.url"
            :date="experience.date"
            :position="experience.position"
          />
        </div>
      </div>

      <div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Education
        </h3>

        <div class="grid gap-2 mt-4">
          <CardExperience
            v-for="(experience, index) in experiences.education"
            :key="`experience-education-${index}`"
            :title="experience.title"
            :url="experience.url"
            :date="experience.date"
            :position="experience.position"
          />
        </div>
      </div>
    </section>

    <section id="technologies" class="mt-6">
      <h3
        class="mt-4 text-xl font-semibold text-gray-900 md:mt-10 dark:text-gray-100"
      >
        Technologies I use
      </h3>

      <div class="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-3 md:grid-cols-4">
        <CardSkill
          v-for="(skill, index) in skills"
          :key="`skill-${index}`"
          :title="skill"
        />
      </div>
    </section>

    <section id="repositories" class="mt-6">
      <h2 class="mt-10 text-xl font-semibold text-gray-900 dark:text-gray-100">
        My GitHub repositories
      </h2>

      <div class="mt-4">
        <div
          v-if="$fetchState.pending"
          class="grid grid-cols-1 gap-2 md:grid-cols-2"
        >
          <SkeletonLoader
            v-for="item in 8"
            :key="`repo-skeleton-${item}`"
            type="repository"
          />
        </div>

        <div
          v-else-if="$fetchState.error"
          class="text-gray-900 dark:text-gray-100"
        >
          Couldn't load GitHub repositories.
        </div>

        <div
          v-else-if="repos.length > 0"
          class="grid grid-cols-1 gap-2 md:grid-cols-2"
        >
          <SmartLink
            v-for="(repo, index) in repos"
            :key="`repo-${index}`"
            :href="repo.html_url"
            title="Click here to visit this repository"
            blank
          >
            <CardRepository
              :name="repo.name"
              :language="repo.language"
              :stars="repo.stargazers_count"
              :description="repo.description"
              class="h-full"
            />
          </SmartLink>
        </div>
      </div>
    </section>

    <section id="socials" class="mt-6">
      <h2 class="mt-10 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Follow me
      </h2>

      <Socials class="mt-2" />
    </section>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

/* Interfaces */
import type { Repository } from "../types/Response/GitHub"

interface Project {
  title: string
  description: string
  href?: string
  to?: string
  image?: string
}

interface Experience {
  title: string
  url: string
  position: string
  date: string
}

interface ExperienceObject {
  jobs: Experience[]
  education: Experience[]
}

export default Vue.extend({
  data() {
    return {
      repos: [] as Repository[],
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
      experiences: {
        jobs: [
          {
            title: "Novit Ai",
            url: "https://novit.ai/",
            position: "Full Stack Software Engineer",
            date: "2021-",
          },
          {
            title: "Caycom Tech",
            url: "https://novit.ai/",
            position: "Backend Developer",
            date: "2020-2021",
          },
          {
            title: "Pharmacircle",
            url: "https://novit.ai/",
            position: "Data Analyst - QA Engineer",
            date: "2019-2020",
          },
        ],
        education: [
          {
            title: "Turkish Air Defense School",
            url: "https://hvtekok.hvkk.tsk.tr/",
            position: "Air defense officer",
            date: "2015-2016",
          },
          {
            title: "Turkish Air Force Academy",
            url: "http://www.hho.edu.tr/EN/",
            position: "Bachelors of Aerospace Engineering",
            date: "2011-2015",
          },
          {
            title: "Turkish Air Force Military High School",
            url: "https://www.rotosis.com/",
            position: "High school",
            date: "2008-2011",
          },
          {
            title: "Kuleli Military High School",
            url: "https://en.wikipedia.org/wiki/Kuleli_Military_High_School",
            position: "High school junior",
            date: "2007-2008",
          },
        ],
      } as ExperienceObject,
      skills: [
        "JavaScript",
        "Nuxt.js",
        "Vue.js",
        "PHP",
        "Python",
        "Redis",
        "Docker",
        "Aws",
        "Linux",
        "Pytorch",
        "Django",
        "Django Rest",
        "Elasticsearch",
        "Fastapi",
        "SQLAlchemy",
        "Opencv",
        "Yolov5",
        "Detectron2",
        "Nginx",
        "MySQL",
        "PostgreSQL",
        "Git",
        "Scrapy",
        "Splash",
        "Selenium",
        "Pandas",
      ],
    }
  },
  fetchOnServer: false,
  async fetch() {
    const filter = ["emingenc", "DBM", "emingenc.github.io"]

    const repos: Repository[] = (
      await this.$axios.get(
        "https://api.github.com/users/emingenc/repos?per_page=100"
      )
    ).data

    this.repos = repos
      ?.filter((repo) => repo.fork === false && !filter.includes(repo.name))
      ?.sort((a, b) => b?.stargazers_count - a?.stargazers_count)
  },
  head: {
    title: "Home",
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

<style lang="scss" scoped>
.description-link {
  @apply border-gray-500 border-b-2 border-opacity-50 hover:border-opacity-75;
}
</style>
