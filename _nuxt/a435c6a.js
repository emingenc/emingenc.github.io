(window.webpackJsonp=window.webpackJsonp||[]).push([[10,21,28],{324:function(t,e,r){"use strict";r.r(e);var n=r(2),component=Object(n.a)({},(function(){var t=this.$createElement,e=this._self._c||t;return e("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"}},[e("path",{attrs:{"stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"}})])}),[],!1,null,null,null);e.default=component.exports},327:function(t,e,r){var content=r(343);content.__esModule&&(content=content.default),"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,r(64).default)("0bb28c2d",content,!0,{sourceMap:!1})},340:function(t,e,r){"use strict";r.r(e);var n=r(2),component=Object(n.a)({},(function(){var t=this.$createElement,e=this._self._c||t;return e("svg",{attrs:{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"}},[e("path",{attrs:{"stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M5 13l4 4L19 7"}})])}),[],!1,null,null,null);e.default=component.exports},342:function(t,e,r){"use strict";r(327)},343:function(t,e,r){var n=r(63)(!1);n.push([t.i,"div.button[data-v-7b467316]>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(0.5rem*var(--tw-space-x-reverse));margin-left:calc(0.5rem*(1 - var(--tw-space-x-reverse)))}div.button[data-v-7b467316]{--tw-bg-opacity:1;background-color:rgba(229,231,235,var(--tw-bg-opacity));--tw-bg-opacity:0.4;border-radius:9999px;cursor:pointer;display:flex;height:3rem;padding:.5rem;width:3rem;transition-property:box-shadow;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.dark div.button[data-v-7b467316]{--tw-bg-opacity:1;background-color:rgba(31,41,55,var(--tw-bg-opacity))}div.button[data-v-7b467316]:hover{--tw-shadow-color:0,0,0;--tw-shadow:0 4px 6px -1px rgba(var(--tw-shadow-color),0.1),0 2px 4px -1px rgba(var(--tw-shadow-color),0.06);box-shadow:0 0 transparent,0 0 transparent,var(--tw-shadow);box-shadow:var(--tw-ring-offset-shadow,0 0 transparent),var(--tw-ring-shadow,0 0 transparent),var(--tw-shadow)}",""]),t.exports=n},394:function(t,e,r){"use strict";r.r(e);r(67),r(40);var n=r(0).a.extend({props:{type:{type:String,required:!1,default:"normal"},title:{type:String,required:!0,default:null},path:{type:String,required:!0,default:null}},data:function(){return{copied:!1}},methods:{share:function(option){var t=this;if("url"===option){var e=this.$refs["share-url"];e?(e.select(),document.execCommand("copy")):((e=document.createElement("input")).value=this.path?"https://emingenc.gitthub.io".concat(this.path):location.href,document.body.appendChild(e),e.select(),document.execCommand("copy"),document.body.removeChild(e)),this.copied=!0,setTimeout((function(){return t.copied=!1}),3e3)}else{var r="";switch(option){case"twitter":r="https://twitter.com/intent/tweet?via=emingench&text=".concat(encodeURIComponent(this.title+"\n"+location.href));break;case"telegram":r="https://telegram.me/share/url?url=".concat(encodeURIComponent(location.href));break;case"whatsapp":r="https://api.whatsapp.com/send?text=".concat(encodeURIComponent(this.title+"\n"+location.href))}window.open(r,"".concat(option[0].toUpperCase()+option.toLowerCase().slice(1)),"width=400,height=550")}}}}),o=(r(342),r(2)),component=Object(o.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return"vertical"===t.type?r("div",{staticClass:"grid gap-2 grid-cols-1"},[r("div",{staticClass:"button",on:{click:function(e){return t.share("twitter")}}},[r("IconBrand",{staticClass:"text-[#1DA1F2]",attrs:{brand:"twitter"}})],1),t._v(" "),r("div",{staticClass:"button",on:{click:function(e){return t.share("telegram")}}},[r("IconBrand",{staticClass:"text-[#2EAADE]",attrs:{brand:"telegram"}})],1),t._v(" "),r("div",{staticClass:"button",on:{click:function(e){return t.share("whatsapp")}}},[r("IconBrand",{staticClass:"text-[#25D366]",attrs:{brand:"whatsapp"}})],1),t._v(" "),r("div",{staticClass:"button",on:{click:function(e){return t.share("url")}}},[!0===t.copied?r("IconCheck",{staticClass:"text-green-500"}):r("IconLink",{staticClass:"text-gray-800 dark:text-gray-200"})],1)]):r("div",{staticClass:"grid gap-4 grid-cols-1 sm:grid-cols-3"},[r("div",{staticClass:"flex space-x-2 items-center"},[r("div",{staticClass:"button",on:{click:function(e){return t.share("twitter")}}},[r("IconBrand",{staticClass:"text-[#1DA1F2]",attrs:{brand:"twitter"}})],1),t._v(" "),r("div",{staticClass:"button",on:{click:function(e){return t.share("telegram")}}},[r("IconBrand",{staticClass:"text-[#2EAADE]",attrs:{brand:"telegram"}})],1),t._v(" "),r("div",{staticClass:"button",on:{click:function(e){return t.share("url")}}},[r("IconBrand",{staticClass:"text-[#25D366]",attrs:{brand:"whatsapp"}})],1)]),t._v(" "),r("div",{directives:[{name:"tippy",rawName:"v-tippy",value:{content:"Kopyalandı!",trigger:"click"},expression:"{\n      content: 'Kopyalandı!',\n      trigger: 'click',\n    }"}],staticClass:"flex space-x-2 relative items-center sm:col-span-2"},[r("input",{ref:"share-url",staticClass:"rounded-md w-full p-3 ring-1 ring-opacity-25 ring-gray-800 focus:outline-none sm:py-3 sm:px-4 dark:bg-gray-800 dark:text-gray-100",attrs:{readonly:""},domProps:{value:"https://emingenc.gitthub.io"+t.path},on:{click:function(e){return t.share("url")}}}),t._v(" "),r("transition",{attrs:{name:"fade"}},[!0===t.copied?r("div",{staticClass:"rounded-full bg-green-500 p-1 right-2 absolute"},[r("IconCheck",{staticClass:"h-5 text-gray-100 w-5"})],1):t._e()])],1)])}),[],!1,null,"7b467316",null);e.default=component.exports;installComponents(component,{IconBrand:r(220).default,IconCheck:r(340).default,IconLink:r(324).default})}}]);