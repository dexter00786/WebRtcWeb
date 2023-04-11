import React, {useCallback, useEffect, useState} from "react";
import { useSocket } from "../context/SocketProvider";
import ReactPlayer from 'react-player';
import peer from '../service/peer';

const RoomPage = () => {
const socket = useSocket();
const [remoteSocketId, setRemoteSocketId] = useState(null);
const [myStream, setMyStream] = useState();
const [remoteStream, setRemoteStream] = useState();

const handleUserJoined = useCallback(({email, id})=>{
        console.log(`${email} joined ${id} room`);
        setRemoteSocketId(id); 
},[]);

const handleCallUser = useCallback(async ()=> {
    const stream = await navigator.mediaDevices.getUserMedia({audio : true, video : true});
    const offer = await peer.getOffer()
    socket.emit('user : call', {to : remoteSocketId, offer})
    setMyStream(stream);
},[remoteSocketId, socket])

const handleIncomingCall = useCallback( async ({from, offer})=> {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({audio : true, video : true});
    setMyStream(stream);
    console.log(`incoming call from`, from, offer);
    const ans = await peer.getAnswer(offer);
    console.log(ans)
    socket.emit('call:accepted',{to : from, ans:ans})
},[socket])

const sendStream = useCallback(() => {
    for (const track of myStream.getTracks()){
        peer.peer.addTrack(track, myStream);
    }
},[myStream])

const handleCallAccepted = useCallback(({from, ans})=> {
    peer.setLocalDescription(ans);
    console.log('call accepted');
    sendStream();
},[sendStream])

const handleNegotiatonNedded = useCallback(async ()=> {
        const offer = await peer.getOffer();
        socket.emit('peer:nego:needed',{offer, to : remoteSocketId})
    },[remoteSocketId, socket])

const handleNegotiatonIncoming = useCallback(async ({from, offer})=> {
    const ans = await peer.getAnswer(offer);
    socket.emit('peer:nego:done', {to : from, ans})
},[socket])


const handleNegoNeedFinal = useCallback( async ({ans})=> {
   await peer.setLocalDescription(ans)
},[])

useEffect(()=> {
    peer.peer.addEventListener('negotiationneeded', handleNegotiatonNedded );
    return () => {
         peer.peer.removeEventListener('negotiationneeded', handleNegotiatonNedded );
    }
},[handleNegotiatonNedded])

useEffect(()=> {
    peer.peer.addEventListener('track', async ev => {
        const remoteStream = ev.streams;
        console.log("Got trackssss")
        setRemoteStream(remoteStream[0]);
    })
},[])
useEffect(()=> {
    socket.on('user : joined', handleUserJoined);
    socket.on('incoming : call', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on("peer:nego:needed", handleNegotiatonIncoming);
    socket.on('peer:nego:final', handleNegoNeedFinal);
    return () => {
        socket.off('user : joined', handleUserJoined);
        socket.off('incoming : call', handleIncomingCall);
        socket.off('call:accepted', handleCallAccepted);
        socket.off("peer:nego:needed", handleNegotiatonIncoming);
        socket.off('peer:nego:final', handleNegoNeedFinal);
        }
},[socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleNegotiatonIncoming, handleNegoNeedFinal])
console.log(remoteStream)
    return (
        <div>
            <h1>Room Page</h1>
            <h4>{remoteSocketId ? 'you are connected': 'no one in the room'}</h4>
            {myStream && <button onClick={sendStream}>Send Stream</button>}
            {remoteSocketId && <button onClick={handleCallUser} >call</button>}
            {myStream && 
            <>
                <h1>This is my stream</h1>
                <ReactPlayer  playing  height='500px' width='500px' url={myStream}/>
            </>}

             {remoteStream && 
            <>
                <h1>This is remote stream</h1>
                <ReactPlayer  playing  height='500px' width='500px' url={remoteStream}/>
            </>}
        </div>
    )
}

export default RoomPage;