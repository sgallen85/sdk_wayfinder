import { GetSDK } from '../mp/GetSDK';
import { Sweep } from '../mp/sdk';
import { distance, Point3 } from './utils';

/**
 * Path given by `findShortestPath()`. List of sweep ids in reverse order. It's a separate type
 * just in case the return type changes.
 */
export type SweepPath = string[];

/**
 * Graph given by `createGraph`. Adjacency list, with sweep ids mapping to a list of neighboring ids,
 * who each map to corresponding distances.
 */
interface SweepGraph {
  [a_id: string]: AdjacencyNode;
}
interface AdjacencyNode {
  [b_id: string]: number;
}

export interface SweepPositions {
  [id: string]: Point3;
}

export default class Pathfinder {

  private VERT_THRESHOLD = 1.; // penalize sweeps vertically separated by this distance, in meters
  private HORZ_THRESHOLD = 10.0; // penalize sweeps horizontally separated by this distance, in meters

  private graph: SweepGraph = {};
  public path: SweepPath = [];

  public async test() {
    let sdk = await GetSDK('hi', 'there');
    (await sdk.Model.getData()).sweeps;
  }

  /**
   * Generate graph of sweep distances.
   * @param {*} sweeps List of sweeps, as returned by `sdk.Model.getData().sweeps`
   * @param {*} sweepPositions Table of sweep positions
   * @returns The distance between two neighboring sweeps is obtained by `adjList[sweep_a_sid][sweep_b_sid]`
   */
  public createGraph(sweeps: Sweep.SweepData[], sweepPositions: SweepPositions): void {
      const adjList: SweepGraph = {};
      for (let i=0; i<sweeps.length; i++) {
          const sweep_a = sweeps[i];
          adjList[sweep_a.sid] = {};
          const neighbor_sids = sweep_a.neighbors;
          for (let j=0; j<neighbor_sids.length; j++) {
              const sweep_b_sid = neighbor_sids[j];
              const d = distance(sweep_a.position, sweepPositions[sweep_b_sid]);
              adjList[sweep_a.sid][sweep_b_sid] = d;
          }
      }
      this.graph = adjList;
  }
      
  function heuristic(i_sid, j_sid, sweepPositions) {
      // Heuristic function for A*. Just take Euclidean distance.
      return distance(sweepPositions[i_sid], sweepPositions[j_sid]);
  }

  function penalty(i_sid, j_sid, sweepPositions) {
      // Additional penalty to avoid large vertical/horizontal jumps, if possible
      return ((sweepPositions[i_sid].y - sweepPositions[j_sid].y)/VERT_THRESHOLD)**4 
          +  (((sweepPositions[i_sid].x - sweepPositions[j_sid].x)**2 + (sweepPositions[i_sid].z - sweepPositions[j_sid].z)**2)/HORZ_THRESHOLD)**2;
  }

  /**
   * Find shortest path between two sweeps, connected by valid movements.
   * @param {string} a_sid SID of starting sweep
   * @param {string} b_sid SID of ending sweep
   * @param {*} adjList Graph of sweep distances, as returned by `createGraph`
   * @param {*} sweepPositions Table of sweep positions
   * @returns Path represented by list of sweep SIDs (string) in reverse order, i.e. [b_sid, ..., a_sid]
   */
  function findShortestPath(a_sid: string, b_sid: string, adjList, sweepPositions): SweepPath {

      // check SIDs are valid
      if (adjList[a_sid] === undefined || adjList[b_sid] === undefined) {
          console.error("Sweep SID(s) is invalid.");
          return;
      }

      const ht = {}; // hash table that stores the following info for each encountered sweep:
      ht[a_sid] = {"visited": false, "distance": 0, "cost": 0, "parent": null};

      // loop A* algorithm
      let debug_n = 0; // count number of iterations

      while (true) {
          debug_n += 1;
          // find unvisited sweep with minimum cost = distance  + heuristic
          // TODO: optimize with priority queue
          let min_sid;
          const encountered_sids = Object.keys(ht);
          for (let i=0; i<encountered_sids.length; i++) {
              const sid = encountered_sids[i];
              if (!ht[sid].visited && (min_sid === undefined || ht[sid].cost < ht[min_sid].cost)) {
                  min_sid = sid;
              }
          }
          if (min_sid === undefined) {
              console.error("Could not find path; sweeps are not connected.");
              return;
          }
          // check if sweep is ending point
          if (min_sid === b_sid) {
              break;
          }
          // add all neighbors of `min_sid`
          ht[min_sid].visited = true;
          const neighbor_sids = Object.keys(adjList[min_sid]);
          for (let i=0; i<neighbor_sids.length; i++) {
              const sid = neighbor_sids[i];
              const dist = ht[min_sid].distance + adjList[min_sid][sid];
              const cost = dist + penalty(min_sid, sid, sweepPositions) + heuristic(sid, b_sid, sweepPositions);
              if (sid in ht) { // if sweep has been encountered
                  if (!ht[sid].visited && (ht[sid].cost > cost)) { // if not visited and smaller cost, then update
                      ht[sid].parent = min_sid;
                      ht[sid].distance = dist;
                      ht[sid].cost = cost;
                  }
              } else { // if sweep has not been encountered yet
                  ht[sid] = {"visited": false, "distance": dist, "cost": cost, "parent": min_sid};
              }
          }
      }
      // traverse graph back to starting point
      var sid = b_sid;
      path = [sid];
      while (ht[sid].parent !== null) {
          sid = ht[sid].parent;
          path.push(sid);
      }
      console.log("Pathfind iterations: %d", debug_n);
      return path;
  }
}