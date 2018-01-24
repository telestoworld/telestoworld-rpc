import { test, future } from './support/ClientHelpers'
import { MessageBusClient } from './support/MessageBusClient'
import { Test } from './support/ClientCommons'

const winingCombinations = [
  [0, 1, 2], // 1 row
  [3, 4, 5], // 2 row
  [6, 7, 8], // 3 row

  [0, 3, 6], // 1 col
  [1, 4, 7], // 2 col
  [2, 5, 8], // 3 col

  [0, 4, 8], // nw - se
  [6, 4, 2] // sw - ne
]

type GameSymbol = 'x' | 'o' | null

class Game {
  mySymbol: GameSymbol = null

  board: GameSymbol[] = [null, null, null, null, null, null, null, null, null]

  getWinner() {
    return ['x', 'o'].find($ =>
      winingCombinations.some(combination =>
        combination.every(position => this.board[position] === $)
      )
    )
  }

  selectMySymbol(symbol: GameSymbol) {
    this.mySymbol = symbol
  }

  setAt(position: number, symbol: GameSymbol) {
    this.board[position] = symbol
  }
}

test(async ScriptingClient => {
  const { Test, TicTacToeBoard } = (await ScriptingClient.loadComponents([
    'Test',
    'TicTacToeBoard'
  ])) as {
    Test: Test
    TicTacToeBoard: any
  }

  const futureWinner = future()

  const messageBus = await MessageBusClient.acquireChannel(
    ScriptingClient,
    'rtc://tictactoe.signaling.com'
  )

  const game = new Game()

  TicTacToeBoard.onChooseSymbol(({ symbol }: { symbol: GameSymbol }) => {
    game.selectMySymbol(symbol)
  })

  TicTacToeBoard.onClickPosition(({ position }: { position: number }) => {
    messageBus.emit('set_at', position, game.mySymbol)
  })

  messageBus.on('set_at', (index: number, symbol: GameSymbol) => {
    game.setAt(index, symbol)

    const winner = game.getWinner()

    if (winner !== undefined) {
      Test.pass(winner)
      futureWinner.resolve(winner)
    }
  })

  await TicTacToeBoard.iAmConnected()

  // wait every command to execute
  console.log('class the winner is', await futureWinner)
})
