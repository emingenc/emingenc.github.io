(window.webpackJsonp=window.webpackJsonp||[]).push([[10,19,22],{310:function(t,e,r){"use strict";r.r(e);var l=r(2),component=Object(l.a)({},(function(){var t=this.$createElement,e=this._self._c||t;return e("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"}},[e("path",{attrs:{"stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"}})])}),[],!1,null,null,null);e.default=component.exports},316:function(t,e,r){"use strict";r.r(e);var l=r(2),component=Object(l.a)({},(function(){var t=this.$createElement,e=this._self._c||t;return e("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 20 20",fill:"currentColor"}},[e("path",{attrs:{"fill-rule":"evenodd",d:"M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z","clip-rule":"evenodd"}})])}),[],!1,null,null,null);e.default=component.exports},347:function(t,e,r){"use strict";r.r(e);r(13),r(32);var l=r(0).a.extend({props:{post:{type:Object,required:!0,default:function(){}},type:{type:String,required:!1,default:"normal"}},computed:{getPostMeta:function(){var t,e,r,l;if(!this.post)return{};var image=(null===(t=this.post)||void 0===t?void 0:t.image)||"/assets/images/posts/".concat(null===(e=this.post)||void 0===e?void 0:e.slug,".jpg")||"";return{title:this.post.title||"",description:this.post.description||"",slug:this.post.slug||"",special:this.post.special||!1,tag:(null===(l=null===(r=this.post)||void 0===r?void 0:r.tags)||void 0===l?void 0:l[0])||"",image:image}},getPostDate:function(){return this.post&&this.post.createdAt?this.$getReadableDate(this.post.createdAt):null}}}),o=r(2),component=Object(o.a)(l,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return"normal"===t.type?r("SmartLink",{staticClass:"rounded-lg cursor-pointer space-y-2 bg-gray-200 bg-opacity-40 p-3 transition-shadow hover:shadow-md dark:bg-gray-800",attrs:{title:t.getPostMeta.title,href:{name:"blog-post-slug",params:{slug:t.getPostMeta.slug}}}},[r("SmartImage",{staticClass:"rounded h-34 w-full filter dark:brightness-75",attrs:{src:t.getPostMeta.image}}),t._v(" "),r("div",{staticClass:"flex flex-col"},[r("span",{staticClass:"font-medium text-sm leading-tight text-gray-600 uppercase dark:text-gray-400"},[t._v("\n      "+t._s(t.getPostMeta.tag)+"\n    ")]),t._v(" "),r("h2",{staticClass:"font-bold text-lg leading-tight text-gray-800 truncate dark:text-gray-200"},[t._v("\n      "+t._s(t.getPostMeta.title)+"\n    ")]),t._v(" "),r("p",{staticClass:"text-gray-700 line-clamp-2 dark:text-gray-300"},[t._v("\n      "+t._s(t.getPostMeta.description)+"\n    ")])])],1):"text"===t.type?r("SmartLink",{staticClass:"rounded-lg cursor-pointer flex space-x-4 bg-gray-200 bg-opacity-40 p-3 transition-shadow items-center hover:shadow-md dark:bg-gray-800",attrs:{title:t.getPostMeta.title,href:{name:"blog-post-slug",params:{slug:t.getPostMeta.slug}}}},[r("SmartImage",{staticClass:"rounded flex-shrink-0 h-20 w-24 filter dark:brightness-75",attrs:{src:t.getPostMeta.image}}),t._v(" "),r("div",{staticClass:"flex flex-col overflow-x-hidden"},[r("h2",{staticClass:"font-semibold text-lg text-gray-800 truncate dark:text-gray-200"},[t._v("\n      "+t._s(t.getPostMeta.title)+"\n    ")]),t._v(" "),r("p",{staticClass:"text-gray-700 line-clamp-2 dark:text-gray-300"},[t._v("\n      "+t._s(t.getPostMeta.description)+"\n    ")])])],1):"text-only-title"===t.type?r("SmartLink",{staticClass:"rounded-lg cursor-pointer flex flex-col bg-gray-200 bg-opacity-40 p-3 transition-shadow hover:shadow-md truncate dark:bg-gray-800",attrs:{title:t.getPostMeta.title,href:{name:"blog-post-slug",params:{slug:t.getPostMeta.slug}}}},[r("h2",{staticClass:"text-lg text-gray-800 truncate dark:text-gray-200"},[t._v("\n    "+t._s(t.getPostMeta.title)+"\n  ")]),t._v(" "),r("div",{staticClass:"flex space-x-1 items-center"},[t.getPostMeta.special?r("IconFire",{directives:[{name:"tippy",rawName:"v-tippy",value:{content:"Popüler gönderi",placement:"bottom"},expression:"{\n        content: 'Popüler gönderi',\n        placement: 'bottom',\n      }"}],staticClass:"h-5 text-red-600 w-5 dark:text-red-500"}):t._e(),t._v(" "),r("div",{staticClass:"flex space-x-2 text-gray-700 items-center dark:text-gray-400"},[r("IconClock",{staticClass:"h-5 w-5"}),t._v(" "),r("span",[t._v(t._s(t.getPostDate))])],1)],1)]):t._e()}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{SmartImage:r(141).default,SmartLink:r(80).default,IconFire:r(316).default,IconClock:r(310).default})}}]);