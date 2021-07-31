export interface Post {
  slug?: string
  description?: string
  title?: string
  related?: string[]
  toc?: Toc[]
  body?: Body
  dir?: string
  path?: string
  extension?: string
  createdAt?: Date
  updatedAt?: Date
  /* Custom properties */
  tags?: string[]
  special?: boolean
  image?: string
}

interface Body {
  type?: string
  children?: Child[]
}

interface Child {
  type?: string
  value?: string
  tag?: string
  props?: Props
  children?: Child[]
}

interface Props {
  href?: string
  className?: string[]
  id?: string
}

interface Toc {
  id?: string
  depth?: number
  text?: string
}
