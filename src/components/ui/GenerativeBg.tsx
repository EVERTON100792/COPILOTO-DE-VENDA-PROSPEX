// @ts-nocheck
import { useEffect, useRef } from "react";

export const GenerativeBg = () => {
  useEffect(() => {
    // Generative art Webpack bundle adapted for Fullscreen Dark Mode
    !function(modules){
      function __webpack_require__(moduleId){
        if(installedModules[moduleId])return installedModules[moduleId].exports;
        var module=installedModules[moduleId]={exports:{},id:moduleId,loaded:!1};
        return modules[moduleId].call(module.exports,module,module.exports,__webpack_require__),module.loaded=!0,module.exports
      }
      var installedModules={};
      return __webpack_require__.m=modules,__webpack_require__.c=installedModules,__webpack_require__.p="",__webpack_require__(0)
    }([
      function(module,exports,__webpack_require__){
        "use strict";
        function _interopRequireWildcard(obj){if(obj&&obj.__esModule)return obj;var newObj={};if(null!=obj)for(var key in obj)Object.prototype.hasOwnProperty.call(obj,key)&&(newObj[key]=obj[key]);return newObj.default=obj,newObj}
        function main(){
          (0,_utils.printInfo)("running bg");
          window.drawings||(window.drawings={});
          // ADAPTED: Render only one scene
          var story={"app-bg":scene.getSceneRndCircVelExpose};
          Object.keys(story).forEach(function(sceneName){
            (0,_utils.updateAndStartCanvas)(sceneName,story[sceneName])
          })
        }
        var _utils=__webpack_require__(1),_scenes=__webpack_require__(2),scene=_interopRequireWildcard(_scenes);main()
      },
      function(module,exports){
        "use strict";
        function printInfo(){ }
        function printWarn(){ }
        function updateAndStartCanvas(name,getScene){
          function scrollHandler(){
            var inView=isInViewport(container),animId=window.drawings[canvasId];
            inView?animId||(printInfo("starting: ",canvasId),animloop(scene,canvasId)):animId&&(printInfo("stopping: ",canvasId),cancelAnimationFrame(animId),window.drawings[canvasId]=void 0)
          }
          function clickHandler(){
            // window.removeEventListener("scroll",scrollHandler,!1),canvas.removeEventListener("click",clickHandler,!1),window.drawings[canvasId]&&(printInfo("stopping: ",canvasId),cancelAnimationFrame(window.drawings[canvasId]),window.drawings[canvasId]=void 0),updateAndStartCanvas(name,getScene)
          }
          var canvasId="canvas-"+name,containerId="container-"+name,cs=getCanvasSize(),width=cs.width,height=cs.height,canvasStr='<canvas width="'+width+'" height="'+height+'" class="drawing" id="'+canvasId+'" style="display:block; width:100%; height:100%;"></canvas>',container=document.getElementById(containerId);
          if(!container) return;
          container.innerHTML=canvasStr;
          var canvas=document.getElementById(canvasId),ctx=canvas.getContext("2d"),scene=getScene(ctx,width,height);
          isInViewport(container)&&animloop(scene,canvasId);
          window.addEventListener("scroll",scrollHandler,!1);
          canvas.addEventListener("click",clickHandler,!1)
        }
        function animloop(f,canvasId){
          window.drawings[canvasId]=requestAnimationFrame(function(){return animloop(f,canvasId)});
          f()
        }
        function getCanvasSize(){
          // ADAPTED: Fullscreen dimensions
          var width=window.innerWidth,height=window.innerHeight;
          return{width:width,height:height}
        }
        function isInViewport(element){
          return true; // Always in viewport since it's background
        }
        Object.defineProperty(exports,"__esModule",{value:!0}),exports.printInfo=printInfo,exports.printWarn=printWarn,exports.updateAndStartCanvas=updateAndStartCanvas,exports.animloop=animloop,exports.getCanvasSize=getCanvasSize,exports.isInViewport=isInViewport,function(){for(var lastTime=0,vendors=["ms","moz","webkit","o"],x=0;x<vendors.length&&!window.requestAnimationFrame;++x)window.requestAnimationFrame=window[vendors[x]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[vendors[x]+"CancelAnimationFrame"]||window[vendors[x]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(callback,element){var currTime=(new Date).getTime(),timeToCall=Math.max(0,16-(currTime-lastTime)),id=window.setTimeout(function(){callback(currTime+timeToCall)},timeToCall);return lastTime=currTime+timeToCall,id}),window.cancelAnimationFrame||(window.cancelAnimationFrame=function(id){clearTimeout(id)})}()
      },
      function(module,exports,__webpack_require__){
        "use strict";
        function getBoundary(width,height){var edgeX=5*width/100,edgeTopY=.2*height,edgeBottomY=.2*height,xl=0,xr=width,yb=height,yt=0,xMin=edgeX,xMax=width-edgeX,yMin=edgeTopY,yMax=height-edgeBottomY,yMid=.5*(yMax+yMin),xMid=.5*(xMax+xMin);return{xMin:xMin,xMax:xMax,yMin:yMin,yMax:yMax,yMid:yMid,xMid:xMid,xl:xl,xr:xr,yb:yb,yt:yt}}
        function getSceneUniformSingle(ctx,width,height){}
        function getSceneUniformMulti(ctx,width,height){}
        function getSceneUniformLocal(ctx,width,height){}
        function getSceneUniformVel(ctx,width,height){}
        function getSceneXVel(ctx,width,height){}
        function getSceneXVelHigh(ctx,width,height){}
        function getSceneXVelExpose(ctx,width,height){}
        function getSceneXYVelExpose(ctx,width,height){}
        function getSceneCircVelExpose(ctx,width,height){}
        function getSceneRndCircVelExpose(ctx,width,height){
          function scene(){
            velx=(0,_array.permute)(velx,noise),vely=(0,_array.permute)(vely,noise);
            var sx=0,sy=0;
            path=path.map(function(_ref7,i){
              var x=_ref7.x,y=_ref7.y;
              return sx+=velx[i],sy+=vely[i],{x:(0,_array.limit)(x+sx,boundary.xr,boundary.xl),y:(0,_array.limit)(y+sy,boundary.yb,boundary.yt)}
            });
            (0,_draw.drawDots)(ctx,path,dotSize,!0)
          }
          ctx.lineWidth=THINLINEWIDTH,ctx.fillStyle=WHITE,(0,_draw.clear)(ctx,width,height),ctx.strokeStyle=GRAY,ctx.fillStyle="rgba(0,0,0,0.05)";
          var boundary=getBoundary(width,height),num=Math.floor(width/2),dotSize=1.5,noise=.01,rad=Math.min(.2*width,.2*height),path=(0,_array.getRndCirc)(num,boundary.xMid,boundary.yMid,rad),velx=(0,_array.getNs)(num,0),vely=(0,_array.getNs)(num,0);
          return scene
        }
        Object.defineProperty(exports,"__esModule",{value:!0}),exports.getSceneRndCircVelExpose=getSceneRndCircVelExpose;
        var _array=__webpack_require__(3),_draw=(__webpack_require__(1),__webpack_require__(4)),HPI=(Math.PI,2*Math.PI,.5*Math.PI);
        // ADAPTED: Transparent clear and subtle white points
        var WHITE="rgba(0, 0, 0, 0.0)", GRAY="rgba(255, 255, 255, 0.15)", LINEWIDTH=2, THINLINEWIDTH=1;
      },
      function(module,exports,__webpack_require__){
        "use strict";
        function getNs(n,v){for(var res=[],i=0;i<n;i++)res.push(v);return res}
        function getRnd(n,min,max){for(var res=[],i=0;i<n;i++)res.push(min+Math.random()*(max-min));return res}
        function getRndYLinspaceX(n,xMin,xMax,yMin,yMax){}
        function getLinspaceYLinspaceX(n,xMin,xMax,yMin,yMax){}
        function getCirc(n,ix,iy,rad){}
        function getRndCirc(n,ix,iy,rad){for(var res=[],i=0;i<n;i++){var a=Math.random()*TWOPI,x=ix+Math.cos(a)*rad,y=iy+Math.sin(a)*rad;res.push({x:x,y:y})}return res}
        function getRndRect(n,left,right,bottom,top){}
        function permuteY(path,noise){}
        function permute(arr,noise){var newArr=arr.map(function(v){var rnd=(1-2*Math.random())*noise;return v+rnd});return newArr}
        function limit(v,ma,mi){return Math.max(Math.min(v,ma),mi)}
        Object.defineProperty(exports,"__esModule",{value:!0}),exports.getNs=getNs,exports.getRndCirc=getRndCirc,exports.permute=permute,exports.limit=limit;
        var TWOPI=(__webpack_require__(1),2*Math.PI)
      },
      function(module,exports,__webpack_require__){
        "use strict";
        function drawPath(ctx,p){}
        function drawDots(ctx,p,rad,fill){
          for(var i=0;i<p.length;i++){
            var x=p[i].x,y=p[i].y;
            ctx.beginPath(),ctx.arc(x,y,rad,0,TWOPI),ctx.fillStyle="rgba(255,255,255,0.4)";
            fill?ctx.fill():ctx.stroke()
          }
        }
        function drawPathDots(ctx,p,rad){}
        function clear(ctx,width,height){ctx.clearRect(0,0,width,height)} // ADAPTED: clearRect instead of fill
        Object.defineProperty(exports,"__esModule",{value:!0}),exports.drawDots=drawDots,exports.clear=clear;
        var TWOPI=(__webpack_require__(1),Math.PI,2*Math.PI);
      }
    ]);
    
    // Cleanup on unmount
    return () => {
      if (window.drawings && window.drawings["canvas-app-bg"]) {
        cancelAnimationFrame(window.drawings["canvas-app-bg"]);
        window.drawings["canvas-app-bg"] = undefined;
      }
    };
  }, []);

  return (
    <div 
      id="container-app-bg" 
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6,
        mixBlendMode: 'screen',
        overflow: 'hidden'
      }} 
    />
  );
};
