import { testInWorker, future } from "./support/Helpers";
import assert = require('assert');
import { BasePlugin, ScriptingHost } from "../../lib/host";
import { Test } from "./support/Commons";

class TicTacToeBoard extends BasePlugin {
  /**
   * This API should mock the behavior of a board in the floor
   * inside a parcel. It will emit events that mimic click
   * interactions in a board.
   *
   * The class will triger those events via exposed methods that
   * are used in the test scenario
   */

  waitForConnection = future();

  userDidClickPosition(position: number) {
    this.notify('ClickPosition', position);
  }

  userDidChooseSymbol(symbol: 'x' | 'o') {
    this.notify('ChooseSymbol', symbol);
  }

  userDidRequestResults() {
    this.notify('CommandsDidFinish');
  }

  getApi() {
    return {
      iAmConnected: async (...args) => {
        this.waitForConnection.resolve(args);
      }
    };
  }
}

ScriptingHost.registerPlugin('TicTacToeBoard', TicTacToeBoard);

const file = 'test/out/5.0.TicTacToe.js';

describe(file, () => {
  let workerX: ScriptingHost = null;
  let workerO: ScriptingHost = null;

  let apiX: TicTacToeBoard = null;
  let apiO: TicTacToeBoard = null;

  it('starts the workers', async () => {
    workerO = await ScriptingHost.fromURL(file);
    workerX = await ScriptingHost.fromURL(file);

    workerX.setLogging({ logConsole: true });
    workerO.setLogging({ logConsole: true });

    apiX = workerX.getPluginInstance(TicTacToeBoard);
    apiO = workerO.getPluginInstance(TicTacToeBoard);

    // awaits for web socket connections
    await apiX.waitForConnection;
    await apiO.waitForConnection;

    apiX.userDidChooseSymbol('x');
    apiO.userDidChooseSymbol('o');

    // clicks some positions
    apiX.userDidClickPosition(0);
    apiO.userDidClickPosition(1);
    apiX.userDidClickPosition(3);
    apiO.userDidClickPosition(8);
    apiX.userDidClickPosition(6);

    apiX.userDidRequestResults();
    apiO.userDidRequestResults();

    // waits the result
    const resultX = await (workerX.getPluginInstance(Test).waitForPass());
    const resultO = await (workerO.getPluginInstance(Test).waitForPass());

    console.log('X state ', resultX);
    console.log('O state ', resultO);

    // terminates the workers
    workerX.terminate();
    workerO.terminate();
  });
});