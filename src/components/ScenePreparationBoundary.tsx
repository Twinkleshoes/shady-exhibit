import React from 'react';
import {clearSceneResources,reportSceneStage} from '../game/scene-preparation.js';
export class ScenePreparationBoundary extends React.Component<{roundId:string;children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){clearSceneResources(this.props.roundId);reportSceneStage(this.props.roundId,'error');}
 render(){return this.state.failed?<div aria-hidden="true" className="min-h-screen bg-[#101e2d]"/>:this.props.children;}
}
