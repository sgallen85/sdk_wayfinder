import { Component } from 'react';
import './App.css';
import Frame from './Frame';

/**
 * This is the top level class for the app. It handles API key, model ID, and url stuff.
 * Do non-initializing SDK and UI stuff in other components/files.
 */
export default class App extends Component {
  private apiKey = 'e0iyprwgd7e7mckrhei7bwzza';
  private modelId = 'opSBz3SgMg3';

  private src: string; // the url source for the sdk

  constructor(props: any) {
    super(props);
    let queryString = `m=${this.modelId}&applicationKey=${this.apiKey}`;
    queryString += '&title=0&qs=1&hr=0&brand=0&help=0';
    this.src = `/bundle/showcase.html?${queryString}`;
    console.log(this.src);
  }

  public render() {
    console.log('render app');
    return (
      <div className='app'>
        <Frame src={this.src } />
      </div>
    );
  }
}
