import React, { Component, Fragment } from 'react';
import UIkit from 'uikit';
import {
  JOIN_ROOM,
  VOTED,
  CLEAR_POINTS,
  REVEAL_POINTS,
  LEAVE_ROOM,
} from '../sockets/SocketConnection';
import { Nav } from './Nav';
import { Scale } from './Scale';
import { Role } from './Role';
import { POINTER, OBSERVER } from '../constants/roles';
import { SIMPLE } from '../constants/scales';
import { getObserverFromQueryParams } from '../utils/url';

export class Room extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pointers: [],
      observers: [],
      showPoints: false,
      points: null,
      voted: false,
      view: POINTER,
      scale: SIMPLE, // TODO: make this configurable/default to room's scale
      isObserver: getObserverFromQueryParams(), // take this out, put redux in finally.
    };
  }

  componentDidMount() {
    const { socketConnection } = this.props;
    if (socketConnection.conn) {
      socketConnection.conn.addEventListener('message', e => {
        const data = JSON.parse(e.data);
        this.decideAction(data);
      });
    } else {
      this.props.history.push('/');
    }
    this.decideAction = this.decideAction.bind(this);
  }

  componentWillUnmount() {
    const { socketConnection } = this.props;
    socketConnection.close();
  }

  changeRole = event => {
    event.stopPropagation();
    event.preventDefault();
    this.setState({
      view: event.target.value === 'true' ? OBSERVER : POINTER,
    });
  };

  selectPoints = points => {
    this.setState({ points });
  };

  decideAction = data => {
    if (data.event === JOIN_ROOM || data.event === LEAVE_ROOM) {
      this.setState({ pointers: data.payload.players, observers: data.payload.observers });
    }
    if (data.event === VOTED) {
      this.setState(prevState => ({
        ...prevState,
        pointers: updatePlayersPoints(prevState.pointers, data.payload),
      }));
    }
    if (data.event === CLEAR_POINTS) {
      triggerToast('Clearing Points!', 'success');
      this.setState(prevState => ({
        ...prevState,
        pointers: clearPlayersPoints(prevState.pointers),
        points: null,
        voted: false,
      }));
    }
    if (data.event === REVEAL_POINTS) {
      triggerToast('Revealing Points!', 'success');
      this.setState({ showPoints: true });
    }
  };

  vote = () => {
    const { socketConnection } = this.props;
    socketConnection.send(VOTED, this.state.points);
    this.setState(prevState => ({ voted: !prevState.voted }));
  };

  // COMBINE THESE TWO. SHOULD NOTE (VOTE) when you change vote

  changeVote = () => {
    this.setState(prevState => ({ voted: !prevState.voted }));
  };

  revealPoints = () => {
    const { socketConnection } = this.props;
    socketConnection.send(REVEAL_POINTS);
    this.setState({ showPoints: true });
  };

  clearPoints = () => {
    const { socketConnection } = this.props;
    socketConnection.send(CLEAR_POINTS);
    // not sure what the payload should be here, if any
    this.setState({ showPoints: false });
  };

  leaveRoom = () => {
    const { socketConnection } = this.props;
    socketConnection.close();
    this.props.history.push('/');
  };

  render() {
    const { isObserver, showPoints, pointers, observers, points, voted, view, scale } = this.state;
    const pointersView = pointers.map(pointer => (
      <div className="pointer-row" key={pointer.id}>
        <span>{pointer.name}</span>
        <span>{showPoints ? pointer.point : pointer.point ? <span uk-icon="check" /> : ''}</span>
      </div>
    ));
    const observersView = observers.map(obs => (
      <div className="pointer-row" key={obs.id}>
        <span>{obs.name}</span>
      </div>
    ));

    return (
      <div className="room-content">
        <div className="room-content__top">
          <Role
            changeRoleAction={this.changeRole}
            observer={view === OBSERVER}
            pointers={pointers}
            observers={observers}
          />
          {view === POINTER ? pointersView : observersView}
        </div>
        {!isObserver ? (
          <Fragment>
            <Scale
              voted={voted}
              points={points}
              scale={scale}
              selectPointsAction={this.selectPoints}
            />
            <div className="room-content__bottom">
              {!voted ? (
                <button
                  className="uk-button uk-button-default uk-button-large  uk-width-1-1"
                  disabled={points === null}
                  onClick={this.vote}
                >
                  Vote
                </button>
              ) : (
                <button
                  className="uk-button uk-button-default uk-button-large  uk-width-1-1"
                  disabled={points === null}
                  onClick={this.changeVote}
                >
                  Change Vote
                </button>
              )}
            </div>
          </Fragment>
        ) : null}
        <Nav
          revealPointsAction={this.revealPoints}
          clearPointsAction={this.clearPoints}
          leaveRoomAction={this.leaveRoom}
        />
      </div>
    );
  }
}

const updatePlayersPoints = (players, update) => {
  return players.map(player => {
    if (player.id === update.id) {
      player.point = update.point;
    }
    return player;
  });
};

const clearPlayersPoints = players => {
  return players.map(player => {
    return {
      ...player,
      point: '',
    };
  });
};

const triggerToast = (message, type) => {
  UIkit.notification({
    message,
    status: type,
    pos: 'top-center',
    timeout: 2000,
  });
};
