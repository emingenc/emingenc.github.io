(window.webpackJsonp=window.webpackJsonp||[]).push([[38,4,10,12,13,14,20,29,33,34],{310:function(t,e,r){"use strict";r.r(e);var n=r(2),component=Object(n.a)({},(function(){var t=this.$createElement,e=this._self._c||t;return e("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"}},[e("path",{attrs:{"stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"}})])}),[],!1,null,null,null);e.default=component.exports},311:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{title:{type:String,required:!1,default:""},image:{type:String,required:!1,default:null},description:{type:String,required:!1,default:""}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"rounded-lg cursor-pointer bg-gray-200 bg-opacity-40 transition-shadow hover:shadow-md dark:bg-gray-800"},[t.image?r("SmartImage",{staticClass:"rounded-tl rounded-tr",attrs:{src:t.image}}):t._e(),t._v(" "),t.title||t.description?r("div",{staticClass:"p-4"},[t.title?r("h3",{staticClass:"font-medium text-lg text-gray-900 truncate dark:text-gray-100",attrs:{title:t.title}},[t._v("\n      "+t._s(t.title)+"\n    ")]):t._e(),t._v(" "),t.description?r("p",{staticClass:"text-gray-700 line-clamp-2 dark:text-gray-300"},[t._v("\n      "+t._s(t.description)+"\n    ")]):t._e()]):t._e()],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{SmartImage:r(141).default})},313:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{type:{type:String,required:!1,default:"block"},iframeUrl:{type:String,required:!1,default:null}},data:function(){return{itemLoaded:!1}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return"repository"===t.type?r("div",{staticClass:"rounded-md space-y-2 bg-gray-200 bg-opacity-40 p-4 dark:bg-gray-800"},[t._m(0),t._v(" "),r("div",{staticClass:"rounded-md bg-gray-300 h-4 w-full dark:bg-gray-700"}),t._v(" "),r("div",{staticClass:"rounded-md bg-gray-300 h-4 w-4/12 dark:bg-gray-700"})]):"iframe"===t.type?r("div",{class:{"bg-gray-100 dark:bg-gray-800 rounded animate-pulse":!1===t.itemLoaded}},[t.iframeUrl?r("iframe",{class:{"w-full h-full rounded":!0,invisible:!1===t.itemLoaded},attrs:{src:t.iframeUrl},on:{load:function(e){t.itemLoaded=!0}}}):t._e()]):"song"===t.type?r("div",{staticClass:"rounded-lg cursor-pointer flex space-x-2 bg-gray-200 bg-opacity-40 py-2 px-4 transition-shadow items-center select-none hover:shadow-md dark:bg-gray-800"},[r("div",{staticClass:"rounded-md bg-gray-200 flex-shrink-0 h-16 animate-pulse w-16 dark:bg-gray-700"}),t._v(" "),t._m(1)]):"block"===t.type?r("div",{staticClass:"rounded bg-gray-100 animate-pulse dark:bg-gray-800"}):t._e()}),[function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"flex items-center justify-between"},[r("div",{staticClass:"rounded-md bg-gray-300 h-5 animate-pulse w-7/12 dark:bg-gray-700"}),t._v(" "),r("div",{staticClass:"rounded-md bg-gray-300 h-5 animate-pulse w-2/12 dark:bg-gray-700"})])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"flex-grow space-y-1"},[r("div",{staticClass:"rounded bg-gray-200 h-4 animate-pulse w-1/3 dark:bg-gray-700"}),t._v(" "),r("div",{staticClass:"rounded bg-gray-200 h-4 animate-pulse w-2/3 dark:bg-gray-700"})])}],!1,null,null,null);e.default=component.exports},315:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{filled:{type:Boolean,required:!1,default:!1}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return!1===t.filled?r("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"}},[r("path",{attrs:{"stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"}})]):r("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 20 20",fill:"currentColor"}},[r("path",{attrs:{d:"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"}})])}),[],!1,null,null,null);e.default=component.exports},343:function(t,e,r){var content=r(396);content.__esModule&&(content=content.default),"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,r(64).default)("8c08eb1e",content,!0,{sourceMap:!1})},351:function(t,e,r){"use strict";r.r(e);var n=r(3),l=(r(24),r(19),r(16),r(38),r(54),r(68),r(0).a.extend({data:function(){return{finished:!1,lanyard:{},socket:null}},computed:{getStatusDetails:function(){var t,e,r,n,l,o,c=this.lanyard;if(!c)return"Couldn't fetch data from Lanyard";var d=(null===(e=null===(t=c.activities)||void 0===t?void 0:t.filter((function(t){return 4!==t.type})))||void 0===e?void 0:e.pop())||null;if("offline"===(null===(r=this.lanyard)||void 0===r?void 0:r.discord_status))return"Offline";if(!d)return"Online";if("Visual Studio Code"===d.name){var f=(null===(o=null===(l=null===(n=d.state)||void 0===n?void 0:n.replace("📁 ",""))||void 0===l?void 0:l.split(" | "))||void 0===o?void 0:o[0])||"a file";return"Editing ".concat(f," in Visual Studio Code")}if("YouTube Music"===d.name&&d.details&&d.state){var m=d.details||"something";return"Listening to ".concat(m," on YouTube Music")}if("YouTube"===d.name&&d.details&&d.state){var v=d.details||"a video";return"Watching ".concat(v," on YouTube")}switch(d.name){case"Google Meet":return"In a Google Meet meeting";case"Twitch":return"Watching a stream on Twitch";case"Prime Video":return"Watching something on Prime Video";default:return"Online"}},getDiscordStatus:function(){switch(this.lanyard.discord_status){case"online":return"bg-green-500";case"idle":return"bg-yellow-500";case"dnd":return"bg-red-500";default:return"bg-gray-500 dark:bg-gray-200"}}},beforeDestroy:function(){var t;null===(t=this.socket)||void 0===t||t.close()},mounted:function(){var t=this;return Object(n.a)(regeneratorRuntime.mark((function e(){var r;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,t.$lanyard({userId:"633211913387376641",socket:!0});case 2:t.socket=e.sent,null===(r=t.socket)||void 0===r||r.addEventListener("message",(function(e){var data=e.data,r=JSON.parse(data),n=r.t,l=r.d;"INIT_STATE"!==n&&"PRESENCE_UPDATE"!==n||(t.lanyard=l||{}),t.finished=!0}));case 4:case"end":return e.stop()}}),e)})))()}})),o=r(2),component=Object(o.a)(l,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return!1!==t.finished&&t.getStatusDetails&&0!==Object.keys(t.lanyard).length?r("div",{staticClass:"rounded-md flex space-x-2 text-gray-700 items-center dark:text-gray-300"},[r("div",{class:"h-3 w-3 rounded-full flex-shrink-0 "+t.getDiscordStatus}),t._v(" "),r("div",{staticClass:"text-sm leading-tight truncate",attrs:{title:t.getStatusDetails}},[t._v("\n    "+t._s(t.getStatusDetails)+"\n  ")])]):r("SkeletonLoader",{staticClass:"h-[17.5px] w-6/12"})}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{SkeletonLoader:r(313).default})},352:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{title:{type:String,required:!0,default:""},url:{type:String,required:!1,default:null},date:{type:String,required:!1,default:"2020"},position:{type:String,required:!1,default:null}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"overflow-hidden"},[r("SmartLink",{staticClass:"text-gray-800 hover:underline dark:text-gray-100",attrs:{href:t.url,blank:""}},[r("h3",{staticClass:"text-lg"},[t._v(t._s(t.title))])]),t._v(" "),r("div",{staticClass:"flex space-x-2 divide-x-2 divide-gray-300 text-sm text-gray-500 items-center dark:divide-gray-700 dark:text-gray-400"},[r("div",{staticClass:"flex space-x-2 flex-shrink-0 items-center"},[r("IconClock",{staticClass:"h-4 w-4"}),t._v(" "),r("span",[t._v(t._s(t.date))])],1),t._v(" "),t.position?r("div",{staticClass:"pl-2 truncate"},[t._v(t._s(t.position))]):t._e()])],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{SmartLink:r(80).default,IconClock:r(310).default})},353:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{title:{type:String,required:!0,default:""}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"flex space-x-2 text-gray-900 items-center overflow-hidden dark:text-gray-100"},[r("IconDev",{staticClass:"flex-shrink-0 h-7 w-7",attrs:{brand:t.title}}),t._v(" "),r("span",{staticClass:"truncate"},[t._v(t._s(t.title))])],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{IconDev:r(314).default})},354:function(t,e,r){"use strict";r.r(e);r(221);var n=r(0).a.extend({props:{name:{type:String,required:!0},language:{type:String,required:!1,default:null},stars:{type:[String,Number],required:!0},description:{type:String,required:!0}},computed:{getLanguageIcon:function(){return{Vue:"Vue.js"}[this.language]||this.language}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"rounded-lg cursor-pointer bg-gray-200 bg-opacity-40 p-4 transition-shadow hover:shadow-md dark:bg-gray-800"},[r("div",{staticClass:"flex space-x-1 text-gray-900 items-center dark:text-gray-100"},[r("span",{staticClass:"flex-grow space-x-2 truncate"},[t._v("\n      "+t._s(t.name)+"\n    ")]),t._v(" "),r("div",{staticClass:"flex space-x-1 items-center"},[r("div",{staticClass:"flex space-x-1 items-center"},[r("span",[t._v(t._s(t.stars))]),t._v(" "),r("IconStar",{staticClass:"h-6 text-yellow-600 w-6",attrs:{filled:""}})],1),t._v(" "),r("IconDev",{staticClass:"h-5 w-5",attrs:{brand:t.getLanguageIcon}})],1)]),t._v(" "),r("p",{staticClass:"text-gray-700 line-clamp-2 dark:text-gray-300"},[t._v("\n    "+t._s(t.description)+"\n  ")])])}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{IconStar:r(315).default,IconDev:r(314).default})},355:function(t,e,r){"use strict";r.r(e);r(40);var n=r(0).a.extend({data:function(){return{projects:[{title:"Pomodoro - Tomato Luck",description:"Pomodoro app that rewards with luck wheel after pomodoro sessions",image:"/assets/images/projects/pomodoro.png",href:"https://emingenc.github.io/pomodoro_wheel/"},{title:"Yolov5-face detection",description:"you can run face_detect.ipynb with voila and detect faces",image:"/assets/images/projects/facerecognition_1.jpeg",href:"https://github.com/emingenc/yolov5-face"}]}},computed:{getProjects:function(){var t=this.projects;return{featured:(null==t?void 0:t.slice(0,3))||[],rest:(null==t?void 0:t.slice(3))||[]}}}}),l=r(2),component=Object(l.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("section",{attrs:{id:"projects"}},[r("h2",{staticClass:"mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n      My Apps & Games\n    ")]),t._v(" "),r("div",{staticClass:"mt-2 grid gap-2 md:gap-4 md:grid-cols-3"},t._l(t.getProjects.featured,(function(t,e){return r("div",{key:"project-featured-"+e},[t.to||t.href?r("SmartLink",{attrs:{href:t.to||t.href,title:"Click to visit this project",blank:!!t.href}},[r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description,image:t.image}})],1):r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description,image:t.image}})],1)})),0),t._v(" "),r("div",{staticClass:"mt-2 grid gap-2 md:mt-4 md:gap-4 md:grid-cols-2"},t._l(t.getProjects.rest,(function(t,e){return r("SmartLink",{key:"project-rest-"+e,attrs:{href:t.to}},[r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description}})],1)})),1)])}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{CardProject:r(311).default,SmartLink:r(80).default})},395:function(t,e,r){"use strict";r(343)},396:function(t,e,r){var n=r(63)(!1);n.push([t.i,".description-link[data-v-c3edbce8]{--tw-border-opacity:1;border-color:rgba(107,114,128,var(--tw-border-opacity));--tw-border-opacity:0.5;border-bottom-width:2px}.description-link[data-v-c3edbce8]:hover{--tw-border-opacity:0.75}",""]),t.exports=n},424:function(t,e,r){"use strict";r.r(e);var n=r(3),l=(r(24),r(19),r(33),r(16),r(225),r(51),r(40),r(0).a.extend({data:function(){return{repos:[],projects:[{title:"Pomodoro - Tomato Luck",description:"Pomodoro app that rewards with luck wheel after pomodoro sessions",image:"/assets/images/projects/pomodoro.png",href:"https://emingenc.github.io/pomodoro_wheel/"},{title:"Yolov5-face detection",description:"you can run face_detect.ipynb with voila and detect faces",image:"/assets/images/projects/facerecognition_1.jpeg",href:"https://github.com/emingenc/yolov5-face"}],experiences:{jobs:[{title:"Novit Ai",url:"https://novit.ai/",position:"Full Stack Software Engineer",date:"2021-"},{title:"Caycom Tech",url:"https://novit.ai/",position:"Backend Developer",date:"2020-2021"},{title:"Pharmacircle",url:"https://novit.ai/",position:"Data Analyst - QA Engineer",date:"2019-2020"}],education:[{title:"Turkish Air Defense School",url:"https://hvtekok.hvkk.tsk.tr/",position:"Air defense officer",date:"2015-2016"},{title:"Turkish Air Force Academy",url:"http://www.hho.edu.tr/EN/",position:"Bachelors of Aerospace Engineering",date:"2011-2015"},{title:"Turkish Air Force Military High School",url:"https://www.rotosis.com/",position:"High school",date:"2008-2011"},{title:"Kuleli Military High School",url:"https://en.wikipedia.org/wiki/Kuleli_Military_High_School",position:"High school junior",date:"2007-2008"}]},skills:["JavaScript","Nuxt.js","Vue.js","PHP","Python","Redis","Docker","Aws","Linux","Pytorch","Django","Django Rest","Elasticsearch","Fastapi","SQLAlchemy","Opencv","Yolov5","Detectron2","Nginx","MySQL","PostgreSQL","Git","Scrapy","Splash","Selenium","Pandas"]}},fetchOnServer:!1,fetch:function(){var t=this;return Object(n.a)(regeneratorRuntime.mark((function e(){var r,filter,n;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return filter=["emingenc","DBM","emingenc.github.io"],e.next=3,t.$axios.get("https://api.github.com/users/emingenc/repos?per_page=100");case 3:n=e.sent.data,t.repos=null===(r=null==n?void 0:n.filter((function(t){return!1===t.fork&&!filter.includes(t.name)})))||void 0===r?void 0:r.sort((function(a,b){return(null==b?void 0:b.stargazers_count)-(null==a?void 0:a.stargazers_count)}));case 5:case"end":return e.stop()}}),e)})))()},head:{title:"Home"},computed:{getProjects:function(){var t=this.projects;return{featured:(null==t?void 0:t.slice(0,3))||[],rest:(null==t?void 0:t.slice(3))||[]}}}})),o=(r(395),r(2)),component=Object(o.a)(l,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("header",{staticClass:"flex flex-col-reverse py-24 md:items-center md:flex-row"},[r("div",{staticClass:"md:w-8/12"},[r("div",{staticClass:"space-y-px"},[t._m(0),t._v(" "),r("p",{staticClass:"text-gray-800 dark:text-gray-200"},[t._v("\n          Hello, my name is Emin, I am a self\n          taught developer.\n          "),r("SmartLink",{staticClass:"description-link",attrs:{href:"https://pytorch.org/",blank:""}},[t._v("\n            Deep Learning ")]),t._v(",\n          "),r("SmartLink",{staticClass:"description-link",attrs:{href:"https://nuxtjs.org/",blank:""}},[t._v("\n            Nuxt.js")]),t._v("\n          and\n          "),r("SmartLink",{staticClass:"description-link",attrs:{href:"https://www.djangoproject.com/",blank:""}},[t._v("\n            Django")]),t._v(".\n        ")],1)]),t._v(" "),r("Status",{staticClass:"mt-2"})],1),t._v(" "),r("div",{staticClass:"flex flex-shrink-0 mb-8 md:justify-end md:mb-0 md:w-4/12"},[r("SmartImage",{staticClass:"rounded-full h-40 ring-black ring-4 ring-opacity-5 w-40 dark:ring-white dark:ring-opacity-5",attrs:{src:"/assets/images/pp.jpeg"}})],1)]),t._v(" "),r("section",{attrs:{id:"projects"}},[r("h2",{staticClass:"mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n      Projects I currently work on\n    ")]),t._v(" "),r("div",{staticClass:"mt-2 grid gap-2 md:gap-4 md:grid-cols-3"},t._l(t.getProjects.featured,(function(t,e){return r("div",{key:"project-featured-"+e},[t.to||t.href?r("SmartLink",{attrs:{href:t.to||t.href,title:"Click to visit this project",blank:!!t.href}},[r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description,image:t.image}})],1):r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description,image:t.image}})],1)})),0),t._v(" "),r("div",{staticClass:"mt-2 grid gap-2 md:mt-4 md:gap-4 md:grid-cols-2"},t._l(t.getProjects.rest,(function(t,e){return r("SmartLink",{key:"project-rest-"+e,attrs:{href:t.to}},[r("CardProject",{staticClass:"h-full",attrs:{title:t.title,description:t.description}})],1)})),1)]),t._v(" "),r("section",{staticClass:"mt-4 grid gap-6 sm:mt-6 md:md:mt-10 md:gap-8 md:grid-cols-2",attrs:{id:"experiences"}},[r("div",[r("h3",{staticClass:"text-xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n        Experience\n      ")]),t._v(" "),r("div",{staticClass:"grid gap-2 mt-4"},t._l(t.experiences.jobs,(function(t,e){return r("CardExperience",{key:"experience-job-"+e,attrs:{title:t.title,url:t.url,date:t.date,position:t.position}})})),1)]),t._v(" "),r("div",[r("h3",{staticClass:"text-xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n        Education\n      ")]),t._v(" "),r("div",{staticClass:"grid gap-2 mt-4"},t._l(t.experiences.education,(function(t,e){return r("CardExperience",{key:"experience-education-"+e,attrs:{title:t.title,url:t.url,date:t.date,position:t.position}})})),1)])]),t._v(" "),r("section",{staticClass:"mt-6",attrs:{id:"technologies"}},[r("h3",{staticClass:"mt-4 text-xl font-semibold text-gray-900 md:mt-10 dark:text-gray-100"},[t._v("\n      Technologies I use\n    ")]),t._v(" "),r("div",{staticClass:"grid grid-cols-2 gap-2 mt-4 sm:grid-cols-3 md:grid-cols-4"},t._l(t.skills,(function(t,e){return r("CardSkill",{key:"skill-"+e,attrs:{title:t}})})),1)]),t._v(" "),r("section",{staticClass:"mt-6",attrs:{id:"repositories"}},[r("h2",{staticClass:"mt-10 text-xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n      My GitHub repositories\n    ")]),t._v(" "),r("div",{staticClass:"mt-4"},[t.$fetchState.pending?r("div",{staticClass:"grid grid-cols-1 gap-2 md:grid-cols-2"},t._l(8,(function(t){return r("SkeletonLoader",{key:"repo-skeleton-"+t,attrs:{type:"repository"}})})),1):t.$fetchState.error?r("div",{staticClass:"text-gray-900 dark:text-gray-100"},[t._v("\n        Couldn't load GitHub repositories.\n      ")]):t.repos.length>0?r("div",{staticClass:"grid grid-cols-1 gap-2 md:grid-cols-2"},t._l(t.repos,(function(t,e){return r("SmartLink",{key:"repo-"+e,attrs:{href:t.html_url,title:"Click here to visit this repository",blank:""}},[r("CardRepository",{staticClass:"h-full",attrs:{name:t.name,language:t.language,stars:t.stargazers_count,description:t.description}})],1)})),1):t._e()])]),t._v(" "),r("Apps"),t._v(" "),r("section",{staticClass:"mt-6",attrs:{id:"socials"}},[r("h2",{staticClass:"mt-10 text-xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n      Follow me\n    ")]),t._v(" "),r("Socials",{staticClass:"mt-2"})],1)],1)}),[function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"text-2xl font-semibold text-gray-900 md:text-3xl md:text-4xl dark:text-gray-100"},[r("h1",[t._v("Self taught")]),t._v(" "),r("h1",[r("span",{staticClass:"text-blue-600"},[t._v("Full-stack")]),t._v(" Developer")])])}],!1,null,"c3edbce8",null);e.default=component.exports;installComponents(component,{SmartLink:r(80).default,Status:r(351).default,SmartImage:r(141).default,CardProject:r(311).default,CardExperience:r(352).default,CardSkill:r(353).default,SkeletonLoader:r(313).default,CardRepository:r(354).default,Apps:r(355).default,Socials:r(226).default})}}]);