// Socket.io client configuration
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(token: string) {
  const socket = getSocket()
  socket.auth = { token }
  socket.connect()
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
  }
}
