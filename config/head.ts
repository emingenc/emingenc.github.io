import { NuxtOptionsHead } from "@nuxt/types/config/head"

/* Define constants */
const image = "https://emingenc.github.io/icon.png"
const description =
  "Hey, I am Emin, Full-stack developer from Turkey, interested in deep learning, ai, and game developing, trying to improve his programming skills!"

const Head: NuxtOptionsHead = {
  title: "emingenc.github.io",
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    {
      hid: "description",
      name: "description",
      content: description,
    },
    /* Twitter */
    {
      hid: "twitter:card",
      name: "twitter:card",
      content: "summary",
    },
    {
      hid: "twitter:site",
      name: "twitter:site",
      content: "@eggsydev",
    },
    {
      hid: "twitter:creator",
      name: "twitter:creator",
      content: "@eggsydev",
    },
    {
      hid: "twitter:title",
      name: "twitter:title",
      content: "emingenc.github.io",
    },
    {
      hid: "twitter:description",
      name: "twitter:description",
      content: description,
    },
    {
      hid: "twitter:image",
      name: "twitter:image",
      content: image,
    },
    /* Open-Graph */
    {
      hid: "og:type",
      name: "og:type",
      content: "website",
    },
    {
      hid: "og:site_name",
      name: "og:site_name",
      content: "emingenc.github.io",
    },
    {
      hid: "og:description",
      name: "og:description",
      content: description,
    },
    {
      hid: "og:image",
      name: "og:image",
      content: image,
    },
    /* Others */
    {
      hid: "theme-color",
      name: "theme-color",
      content: "#111827",
    },
  ].map((i) => {
    // @ts-ignore-next-line
    if (i.name && !i.property) i.property = i.name
    return i
  }),
  link: [
    {
      rel: "icon",
      type: "image/x-icon",
      href: "https://emingenc.github.io/assets/icons/icon.ico",
    },
    {
      rel: "search",
      type: "application/opensearchdescription+xml",
      title: "Emin's Blog",
      href: "https://emingenc.github.io/opensearch.xml",
    },
  ],
}

export default Head
