(window.webpackJsonp=window.webpackJsonp||[]).push([[36],{416:function(t,e,n){"use strict";n.r(e);var r=n(0).a.extend({data:function(){return{accounts:[{image:"/assets/images/garanti.png",name:"Garanti Bankası",iban:"TR 7200 0620 0008 20000685 3326",revealed:!1},{image:"https://i.vgy.me/R0Jwqn.png",name:"Papara",iban:"2018126806",revealed:!1}]}},head:function(){var title="Donate";return{title:title,meta:this.$prepareMeta({title:title,description:"Like my projects? You can donate to me to boost my performance and help me create more, better projects in the future!",keywords:"donate",url:"https://www.buymeacoffee.com/emingenc"}),link:[{rel:"canonical",href:"https://www.buymeacoffee.com/emingenc"}]}},computed:{getSponsorLinks:function(){return this.$config.sponsor}}}),c=n(2),component=Object(c.a)(r,(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("div",{staticClass:"py-4"},[n("div",{staticClass:"space-y-6 sm:w-9/12"},[t._m(0),t._v(" "),n("section",{staticClass:"space-y-4"},[n("h2",{staticClass:"text-lg text-gray-900 dark:text-gray-100"},[t._v("Support Me On")]),t._v(" "),n("div",{staticClass:"grid gap-4"},[n("SmartLink",{staticClass:"w-max",attrs:{href:t.getSponsorLinks.buymeacoffee,blank:""}},[n("div",{staticClass:"rounded cursor-pointer flex space-x-2 bg-[#FFDD00] py-2 px-4 items-center hover:bg-opacity-95"},[n("SmartImage",{staticClass:"rounded h-7 w-7",attrs:{src:"/assets/images/bmc.png"}}),t._v(" "),n("span",{staticClass:"text-black"},[t._v("Buy me a coffee")])],1)])],1)]),t._v(" "),n("section",{staticClass:"space-y-4"},[n("h2",{staticClass:"text-lg text-gray-900 dark:text-gray-100"},[t._v("My Accounts")]),t._v(" "),n("div",{staticClass:"grid gap-4"},t._l(t.accounts,(function(e,r){return n("div",{key:"account-"+r,staticClass:"flex h-full items-center"},[n("div",{staticClass:"rounded-tl rounded-bl bg-gray-300 dark:bg-gray-800"},[n("SmartImage",{staticClass:"h-24 w-24",attrs:{src:e.image}})],1),t._v(" "),n("div",{staticClass:"rounded-tr rounded-br flex h-full bg-gray-200 w-full pl-4 items-center dark:bg-gray-700"},[n("div",[n("h3",{staticClass:"font-medium text-gray-900 dark:text-gray-100"},[t._v("\n                "+t._s(e.name)+"\n              ")]),t._v(" "),1==e.revealed?n("span",{staticClass:"text-gray-800 dark:text-gray-200"},[t._v("\n                "+t._s(e.iban)+"\n              ")]):n("span",{staticClass:"cursor-pointer text-gray-800 underline dark:text-gray-200",on:{click:function(t){e.revealed=!0}}},[t._v("\n                Click to reveal\n              ")])])])])})),0)])])])}),[function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("header",{staticClass:"space-y-4"},[n("div",{staticClass:"space-y-1"},[n("h1",{staticClass:"font-semibold text-2xl text-gray-900 sm:text-3xl dark:text-gray-100"},[t._v("\n          Donate\n        ")]),t._v(" "),n("div",{staticClass:"space-y-2 text-gray-800 dark:text-gray-200"},[n("p",[t._v("\n            If you like my projects and/or what I do and you want to\n            contribute, make me happy, you can donate to me with the\n            information on this page! Thank you ♥\n          ")]),t._v(" "),n("p",[n("small",{staticClass:"text-sm"},[t._v('\n              P.S. Use the name "Emin Genc" on your transactions.\n            ')])])])])])}],!1,null,null,null);e.default=component.exports;installComponents(component,{SmartImage:n(141).default,SmartLink:n(80).default})}}]);