(window.webpackJsonp=window.webpackJsonp||[]).push([[6,14],{314:function(t,e,r){"use strict";r.r(e);var n=r(0).a.extend({props:{title:{type:String,required:!1,default:""},image:{type:String,required:!1,default:null},description:{type:String,required:!1,default:""}}}),c=r(2),component=Object(c.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"rounded-lg cursor-pointer bg-gray-200 bg-opacity-40 transition-shadow hover:shadow-md dark:bg-gray-800"},[t.image?r("SmartImage",{staticClass:"rounded-tl rounded-tr",attrs:{src:t.image}}):t._e(),t._v(" "),t.title||t.description?r("div",{staticClass:"p-4"},[t.title?r("h3",{staticClass:"font-medium text-lg text-gray-900 truncate dark:text-gray-100",attrs:{title:t.title}},[t._v("\n      "+t._s(t.title)+"\n    ")]):t._e(),t._v(" "),t.description?r("p",{staticClass:"text-gray-700 line-clamp-2 dark:text-gray-300"},[t._v("\n      "+t._s(t.description)+"\n    ")]):t._e()]):t._e()],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{SmartImage:r(141).default})},400:function(t,e,r){"use strict";r.r(e);var n=r(3),c=(r(24),r(100),r(40),r(0)),l=r(78),o=r.n(l),d=r(365),m=r.n(d);o.a.defaults.headers.common.header1={headers:{authority:"play.google.com","cache-control":"max-age=0","sec-ch-ua":'" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',"sec-ch-ua-mobile":"?0","upgrade-insecure-requests":"1","user-agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",accept:"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","x-client-data":"CLO1yQEIjbbJAQiktskBCMS2yQEIqZ3KAQiPucoBCJ2MywEIjJ7LAQigoMsBCNzyywEI7/LLAQjO9ssBCLP4ywEInvnLAQjw+csBCI/6ywEIr/rLAQjv+ssBGLryywEYj/XLAQ==","sec-fetch-site":"none","sec-fetch-mode":"navigate","sec-fetch-user":"?1","sec-fetch-dest":"document"}};var f=c.a.extend({data:function(){return{apps:null}},fetch:function(){var t=this;return Object(n.a)(regeneratorRuntime.mark((function e(){var r,c,l,d;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return c=function(){return(c=Object(n.a)(regeneratorRuntime.mark((function t(e){var r,data;return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,o.a.get(e);case 2:return r=t.sent,data=r.data,t.abrupt("return",m.a.load(data));case 5:case"end":return t.stop()}}),t)})))).apply(this,arguments)},r=function(t){return c.apply(this,arguments)},e.next=4,r("https://play.google.com/store/apps/developer?id=emdiapps");case 4:l=e.sent,d=[],l('div[class="ImZGtf mpg5gc"]').each((function(i,t){var e=l(this),img=e.children().find("img").attr("data-src"),r="https://play.google.com"+e.children().find("a").attr("href"),title=e.children().find(".WsMG1c").text(),n=e.children().find(".b8cIId").text();d[i]={title:title,description:n,image:img,href:r}})),t.apps=d||null;case 8:case"end":return e.stop()}}),e)})))()},computed:{getProjects:function(){var t=this.apps;return{featured:(null==t?void 0:t.slice(0,3))||[],rest:(null==t?void 0:t.slice(3))||[]}}}}),h=r(2),component=Object(h.a)(f,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return t.apps?r("section",{attrs:{id:"apps"}},[r("h2",{staticClass:"mt-10 text-2xl font-semibold text-gray-900 dark:text-gray-100"},[t._v("\n      My Apps & Games\n    ")]),t._v(" "),r("div",{staticClass:"mt-2 grid gap-2 md:gap-4 md:grid-cols-3"},t._l(t.apps,(function(e,n){return r("div",{key:"project-featured-"+n},[e.to||e.href?r("SmartLink",{attrs:{href:e.to||e.href,title:"Click to visit this project",blank:!!e.href}},[r("CardProject",{staticClass:"h-full",attrs:{title:e.title,image:e.image}})],1):t._e()],1)})),0)]):t._e()}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{CardProject:r(314).default,SmartLink:r(80).default})}}]);