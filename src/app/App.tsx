import React, { Component } from 'react';
import { GetSDK } from '../mp/GetSDK';
import { Dictionary, MpSdk, Sweep } from '../mp/sdk';
import './App.scss';
import Frame from './Frame';
import Menu from './ui/Menu';
import MenuButton from './ui/MenuButton';
import Pathfinder from './Pathfinder';
import Translator from './Translator';
import { initComponents } from './sdk-components';
import { pathRendererType } from './sdk-components/PathRenderer';
import { cameraControllerType } from './sdk-components/CameraController';
import { sweepIdToPoint } from './utils';
import { SweepAlias, sweepAliases } from './sweepAliases';
import ControlsOverlay from './ui/overlay/ControlsOverlay';
import FlyModeButton from './ui/overlay/FlyModeButton';
import IconButton from './reusables/icon-button/IconButton';

export interface Sdk extends MpSdk {
  Scene?: any;
}

interface AppState {
  lang: string;
  currSweepId?: string;
  selectedSweepId?: string;
  sweepData: Sweep.SweepData[]; // put in state because changes should trigger rerender
  sweepMap?: Dictionary<MpSdk.Sweep.ObservableSweepData>;
  path?: any; // put in state so path visibility updates trigger rerender
  menuEnabled: boolean;
  flyModeEnabled: boolean;
  flyU: number; // integer in [0, 1] indicating position in flythrough
  flyModePlaying: boolean;
  floorMap?: Dictionary<MpSdk.Floor.FloorData>;
}

const defaultUrlParams: any = {
  m: '5zrTVSLfpMw',
  applicationKey: 'x67cy2qhc1h8f1nkmh1ax3i6c',
  title: '0',
  qs: '1',
  hr: '0',
  brand: '0',
  help: '0',
  play: '1',
}

/**
 * This is the top level class for the app. It handles API key, model ID, and url stuff,
 * and holds references to objects/modules/components for object composition.
 * Do non-initializing SDK and UI stuff in other components/files.
 */
export default class App extends Component<{}, AppState> {

  private src: string; // the url source for the sdk
  private urlLang: string | null = null;
  private sdk?: Sdk;

  private pathNode: any; // the node for the PathRenderer component
  private pathfinder?: Pathfinder;

  private sweepAlias?: SweepAlias; // human-readable alias for sweeps, if available

  private flyNode: any; // the node for the CameraController component
  private camCon: any; // CameraConroller component

  constructor(props: any) {
    super(props);
    const queryString = this.handleUrlParams();
    this.src = `${process.env.PUBLIC_URL}/bundle/showcase.html?${queryString}`;

    this.state = {
      lang: this.urlLang ? this.urlLang : 'en',
      sweepData: [],
      menuEnabled: true,
      flyModeEnabled: false,
      flyU: 0,
      flyModePlaying: false,
    };
  }

  /**
   * Parses the current url params and combines them with the default params, updating when necessary.
   * @returns url param query string (without `?`), ready to be pasted directly into the url
   */
  private handleUrlParams(): string {
    const params = new URLSearchParams(window.location.search);
    this.urlLang = params.get('lang');
    for (const [k, v] of Object.entries(defaultUrlParams)) {
      if (!params.has(k)) {
        params.append(k, ''+v); // convert v to string
      }
    }
    return params.toString();
  }

  // --- React methods ---------------------------------------------------------

  public async componentDidMount() {
    
    this.sdk = await GetSDK('showcase', defaultUrlParams.applicationKey);
    await initComponents(this.sdk);

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Add user-generated Mattertags to the default model
    // In production, this block will be removed
    await this.sdk.Model.getData().then( async (data) => {
      if (data.sid === 'GycExKiYVFp') {
        const mattertags = [];
        mattertags.push(
          {
            label: "Revitalizing the Great Hall",
            description: "Within the building’s Great Hall, new vestibule spaces were created to "+
              "connect the main circulation corridor to new restrooms. Elevator lobbies and "+
              "office suite entrances were treated as extensions of the original McKim design, "+
              "with matching marble flooring and wall base, and stained oak millwork-encased "+
              "openings.",
            anchorPosition: {x: 16.55, y: 1.28-1.5, z: 6.69},
            stemVector: { x: 0, y: 1, z: 0 },
          }
        );
        await this.sdk?.Mattertag.add(mattertags);
      }
    });
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    const { lang } = this.state;

    await this.sdk.Model.getData().then( (data) => {
      const sweepData = data.sweeps;
      this.pathfinder = new Pathfinder(sweepData);
      this.setState({
        sweepData: sweepData,
      });
      this.sweepAlias = sweepAliases[data.sid];
    });

    this.sdk.Sweep.data.subscribe({
      onCollectionUpdated: (collection: Dictionary<MpSdk.Sweep.ObservableSweepData>) => {
        this.setState({
          sweepMap: collection
        });
      },
    });

    this.sdk.Floor.data.subscribe({
      onCollectionUpdated: (collection: Dictionary<MpSdk.Floor.FloorData>) => {
        this.setState({
          floorMap: collection,
        });
      }
    })

    this.sdk.Sweep.current.subscribe((currentSweep: any) => {
      if (currentSweep.sid) {
        console.log(currentSweep.sid, currentSweep.position);
        this.setState({currSweepId: currentSweep.sid,});
      }
    });

    // translate all mattertags, if not English
    if (lang !== 'en')
      this.translateMattertags(lang);
  }

  public componentDidUpdate(_prevProps: any, prevState: AppState) {
    const { currSweepId, selectedSweepId } = this.state;

    // only update path if sweep state changes
    (currSweepId !== prevState.currSweepId ||
    selectedSweepId !== prevState.selectedSweepId) &&
    this.handlePath();
  }

  // --- SDK methods -----------------------------------------------------------

  private onOptionSelect = (id: string) => {
    if (id === this.state.selectedSweepId) {
      this.clearSelection();
    } else {
      this.setState({
        selectedSweepId: id,
      });
    }
  }

  private async handlePath() {
    const { currSweepId, selectedSweepId, sweepMap } = this.state;
    const { sdk, pathfinder } = this;

    if (sdk && sweepMap && currSweepId && selectedSweepId && pathfinder) {
      const path = await pathfinder.findShortestPath(currSweepId, selectedSweepId);
      if (!path) return;
      if (this.pathNode) this.pathNode.stop();
      this.pathNode = await sdk.Scene.createNode();
      this.setState ({
        path: path.length > 1 ? this.pathNode.addComponent(pathRendererType, {
          path: path.map(id => sweepIdToPoint(id, sweepMap)),
          opacity: 0.7,
          radius: 0.12,
          stepMultiplier: 10,
        }) : undefined,
      });
      this.pathNode.start();
    }
  }

  private clearSelection = () => {
    if (this.pathNode) this.pathNode.stop();
    this.setState({
      path: undefined,
      selectedSweepId: undefined,
    });
  }

  private toggleFlyMode = async () => {
    const { flyModeEnabled } = this.state;
    this.setState({
      flyModeEnabled: !flyModeEnabled,
      flyU: 0,
    }, async () => {
      if (flyModeEnabled) {
        await this.exitFly();
      } else {
        await this.initFly();
      }
    });
  };

  private initFly = async () => {
    const { sdk } = this;
    const { path } = this.state;

    if (sdk && path) {
      if (this.flyNode) this.flyNode.stop();
      this.flyNode = await sdk.Scene.createNode();
      this.camCon = this.flyNode.addComponent(cameraControllerType, {
        changeUCallback: (u: number) => this.setState({flyU: u}),
      });
      const cam = this.flyNode.addComponent('mp.camera', {
        enabled: true,
      });
      this.camCon.bind('curve', path, 'curve');
      cam.bind('camera', this.camCon, 'camera');
      this.flyNode.start();

      // orient camera to start of flythrough
      const { position, rotation } = this.camCon.getPoseAt(0);
      await sdk.Mode.moveTo(sdk.Mode.Mode.DOLLHOUSE, {
        position,
        rotation: {x: rotation.x*180/Math.PI, y: rotation.y*180/Math.PI},
      });

      // start flythough
      this.setState({flyU: 0});
      this.playFly();
    }
  };

  private exitFly = async () => {
    const { sdk, flyNode } = this;
    if (flyNode) flyNode.stop();
    if (sdk) sdk.Mode.moveTo(sdk.Mode.Mode.INSIDE);
    this.setState({ flyModePlaying: false, });
  };

  private playFly = () => {
    if (this.camCon) this.camCon.inputs.enabled = true;
    this.setState({ flyModePlaying: true, });
  };
  private pauseFly = () => {
    if (this.camCon) this.camCon.inputs.enabled = false;
    this.setState({ flyModePlaying: false, });
  };
  private setFlyU = (u: number) => {if (this.camCon) this.camCon.setU(u)};

  private toggleMenu = () => {
    this.setState({
      menuEnabled: !this.state.menuEnabled,
    });
  }

  private async translateMattertags(lang: string) {
    const { sdk } = this;

    if (sdk && lang) {
      const Trans = new Translator(lang);
      const mattertagData = await sdk.Mattertag.getData();
      for (let i=0; i<mattertagData.length; i++) {
        const { sid, label, description, media } = mattertagData[i];
        const callBack = (newTexts: string[]) => {
          const [ newLabel, newDescription] = newTexts;
          sdk.Mattertag.editBillboard(sid, {
            label: newLabel, 
            description: newDescription, 
            media,
          });
        };
        Trans.translate([label, description], callBack);
      }
      Trans.checkUsage();
    }
  }

  private async changeLang(lang: string) {
    this.setState({lang});
    this.translateMattertags(lang);
  }

  // --- Render ----------------------------------------------------------------

  public render() {
    const {
      lang,
      currSweepId,
      selectedSweepId,
      sweepData,
      menuEnabled,
      flyModeEnabled,
      flyU,
      path,
      flyModePlaying,
      floorMap,
    } = this.state;

    return (
      <div className='app'>
        <div id='frame-container'>
          <Frame src={this.src} disableClicks={flyModeEnabled} />
          <div id='overlay-container'>
            {/* Put all showcase overlay components here */}
            { path && (
              flyModeEnabled ?
              <ControlsOverlay
                playing={flyModePlaying}
                onPlay={this.playFly}
                onPause={this.pauseFly}
                onExit={this.toggleFlyMode}
                setU={this.setFlyU}
                u={flyU}
              /> 
              :
              <div className='nofly-button-container'>
                <FlyModeButton
                  lang={lang}
                  onClick={this.toggleFlyMode} 
                />
                <IconButton onClick={this.clearSelection} icon='close' classes={['clear-button']} />
            </div>
            )}
          </div>
        </div>
        { !menuEnabled &&
          <MenuButton onClick={this.toggleMenu} />
        }
        { menuEnabled &&
          <Menu
            lang={lang}
            currSweepId={currSweepId}
            selectedSweepId={selectedSweepId}
            sweepData={sweepData}
            sweepAlias={this.sweepAlias}
            floorMap={floorMap}
            onChange={this.onOptionSelect}
            onClose={this.toggleMenu}
            onChangeLang={(e) => this.changeLang(e.target.value)}
          />
        }
        </div>
    );
  }
}
