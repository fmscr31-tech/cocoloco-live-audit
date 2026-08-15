import { useEffect, useState } from "react";

import {
  createPlayer,
  playerWin,
  getState,
  loadGame,
  beginRound
} from "./core/gameEngine";

import Overlay from "./components/Overlay";


function App() {


  const [name, setName] = useState("");

  const [players, setPlayers] = useState([]);

  const [round, setRound] = useState(null);



  useEffect(() => {

    loadGame();

    updateScreen();

  }, []);



  function updateScreen(){

    const state = getState();


    setPlayers(
      state.players
    );


    setRound(
      state.round
    );

  }



  function addNewPlayer(){

    if(name.trim() === "") return;


    createPlayer(name);


    updateScreen();


    setName("");

  }



  function addPlayerWin(id){

    playerWin(id);


    updateScreen();

  }



  function startNewRound(){

    beginRound({

      name: "Habibis",

      duration: 20,

      entryGift: "Corazón Coreano",

      prize: "Bravo"

    });


    updateScreen();

  }




  return (

    <div>


      <h1>
        Coco🥥Loco Live Manager
      </h1>


      <h2>
        Panel de Control
      </h2>


      <hr />


      <button onClick={startNewRound}>

        Iniciar Ronda

      </button>



      <h3>
        Ronda Actual
      </h3>



      {
        round ? (

          <div>

            <p>
              Nombre: {round.name}
            </p>


            <p>
              Estado: {round.status}
            </p>


            <p>
              Premio: {round.prize}
            </p>

          </div>

        ) : (

          <p>
            No hay ronda activa
          </p>

        )
      }



      <hr />



      <h3>
        Agregar Participante
      </h3>



      <input

        value={name}

        onChange={
          e => setName(e.target.value)
        }

        placeholder="Nickname TikTok"

      />


      <button onClick={addNewPlayer}>

        Agregar

      </button>



      <hr />



      <h3>
        Participantes
      </h3>



      {

        players.map(player => (

          <div key={player.id}>


            <strong>
              {player.name}
            </strong>


            {" - Wins: "}


            {player.wins}



            <button

              onClick={() =>
                addPlayerWin(player.id)
              }

            >

              + Win

            </button>


          </div>

        ))

      }



      <hr />


      <Overlay />


    </div>

  );

}


export default App;