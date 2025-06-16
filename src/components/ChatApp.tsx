import React, { useState, useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
} from "@microsoft/signalr";
import { Send, Users, Wifi, WifiOff, Image, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Simple emoji picker component
const EmojiPicker = ({ onEmojiSelect, isOpen, onClose }) => {
  const emojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
    "🥴",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤒",
    "🤕",
    "🤑",
    "🤠",
    "😈",
    "👍",
    "👎",
    "👌",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👏",
    "🙌",
    "🤲",
    "🤝",
    "🙏",
    "✍️",
    "💅",
    "🤳",
    "💪",
    "🦾",
    "🦿",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "🧠",
    "🫀",
    "🫁",
    "🦷",
    "🦴",
    "👀",
    "👁️",
    "👅",
    "👄",
    "💋",
    "🩸",
    "👶",
    "🧒",
    "👦",
    "👧",
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80 max-h-60 overflow-y-auto z-50">
      <div className="grid grid-cols-10 gap-1">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

interface Message {
  id: string;
  user: string;
  text?: string;
  image?: string;
  timestamp: Date;
  isOwn: boolean;
}

interface StoredMessage {
  id: string;
  user: string;
  text?: string;
  image?: string;
  timestamp: string;
}

const ChatApp = () => {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [usingSimulatedMode, setUsingSimulatedMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen for localStorage changes (for simulated multi-user mode)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chat_messages" && e.newValue) {
        loadMessagesFromStorage();
      }
      if (e.key === "chat_users" && e.newValue) {
        const users = JSON.parse(e.newValue);
        setConnectedUsers(users.filter((u: string) => u !== username));
      }
      if (e.key === "chat_typing" && e.newValue) {
        const typingData = JSON.parse(e.newValue);
        if (typingData.user !== username) {
          setIsTyping(typingData.typing);
          setTypingUser(typingData.typing ? typingData.user : "");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [username]);

  const loadMessagesFromStorage = () => {
    const stored = localStorage.getItem("chat_messages");
    if (stored) {
      const storedMessages: StoredMessage[] = JSON.parse(stored);
      const convertedMessages: Message[] = storedMessages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        isOwn: msg.user === username,
      }));
      setMessages(convertedMessages);
    }
  };

  const saveMessageToStorage = (newMessage: Message) => {
    const stored = localStorage.getItem("chat_messages");
    const existing: StoredMessage[] = stored ? JSON.parse(stored) : [];
    const messageToStore: StoredMessage = {
      ...newMessage,
      timestamp: newMessage.timestamp.toISOString(),
    };
    const updated = [...existing, messageToStore];
    localStorage.setItem("chat_messages", JSON.stringify(updated));
  };

  const updateUsersList = (users: string[]) => {
    localStorage.setItem("chat_users", JSON.stringify(users));
    setConnectedUsers(users.filter((u) => u !== username));
  };

  const connectToHub = async () => {
    try {
      const newConnection = new HubConnectionBuilder()
        .withUrl("https://localhost:7071/chathub")
        .withAutomaticReconnect()
        .build();

      // Set up event handlers
      newConnection.on(
        "ReceiveMessage",
        (user: string, messageText: string) => {
          const newMessage: Message = {
            id: Date.now().toString(),
            user,
            text: messageText,
            timestamp: new Date(),
            isOwn: user === username,
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      );

      newConnection.on("ReceiveImage", (user: string, imageData: string) => {
        const newMessage: Message = {
          id: Date.now().toString(),
          user,
          image: imageData,
          timestamp: new Date(),
          isOwn: user === username,
        };
        setMessages((prev) => [...prev, newMessage]);
      });

      newConnection.on("UserJoined", (user: string) => {
        toast({
          title: "User joined",
          description: `${user} joined the chat`,
        });
        setConnectedUsers((prev) => [...prev.filter((u) => u !== user), user]);
      });

      newConnection.on("UserLeft", (user: string) => {
        toast({
          title: "User left",
          description: `${user} left the chat`,
        });
        setConnectedUsers((prev) => prev.filter((u) => u !== user));
      });

      newConnection.on("UserTyping", (user: string, typing: boolean) => {
        if (user !== username) {
          setIsTyping(typing);
          setTypingUser(typing ? user : "");
        }
      });

      newConnection.on("UpdateUserList", (users: string[]) => {
        setConnectedUsers(users);
      });

      newConnection.onreconnecting(() => {
        setIsConnected(false);
        toast({
          title: "Reconnecting...",
          description: "Attempting to reconnect to the chat server",
        });
      });

      newConnection.onreconnected(() => {
        setIsConnected(true);
        toast({
          title: "Reconnected",
          description: "Successfully reconnected to the chat server",
        });
      });

      newConnection.onclose(() => {
        setIsConnected(false);
        setIsJoined(false);
        toast({
          title: "Disconnected",
          description: "Connection to chat server lost",
          variant: "destructive",
        });
      });

      await newConnection.start();
      setConnection(newConnection);
      setIsConnected(true);

      toast({
        title: "Connected",
        description: "Successfully connected to chat server",
      });
    } catch (error) {
      console.error("Connection failed:", error);
      setUsingSimulatedMode(true);
      setIsConnected(true);
      toast({
        title: "Simulated Mode",
        description:
          "Using simulated multi-user mode. Open multiple browser windows to test!",
      });
    }
  };

  const joinChat = async () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to join the chat",
        variant: "destructive",
      });
      return;
    }

    try {
      if (connection && connection.state === HubConnectionState.Connected) {
        await connection.invoke("JoinChat", username);
      } else if (usingSimulatedMode) {
        // Add user to simulated users list
        const existing = localStorage.getItem("chat_users");
        const users = existing ? JSON.parse(existing) : [];
        if (!users.includes(username)) {
          users.push(username);
          updateUsersList(users);
        }
        loadMessagesFromStorage();
      }
      setIsJoined(true);
      toast({
        title: "Joined chat",
        description: usingSimulatedMode
          ? `Welcome! Open another browser window with a different username to test multi-user chat.`
          : `Welcome to the chat, ${username}!`,
      });
    } catch (error) {
      console.error("Failed to join chat:", error);
      setIsJoined(true);
      setUsingSimulatedMode(true);
      toast({
        title: "Simulated mode",
        description:
          "Open multiple browser windows with different usernames to test!",
      });
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      user: username,
      text: message.trim(),
      timestamp: new Date(),
      isOwn: true,
    };

    try {
      if (connection && connection.state === HubConnectionState.Connected) {
        await connection.invoke("SendMessage", username, message.trim());
      } else {
        // Simulated mode - save to localStorage
        saveMessageToStorage(newMessage);
        setMessages((prev) => [...prev, newMessage]);
      }
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      saveMessageToStorage(newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;

      const newMessage: Message = {
        id: Date.now().toString() + Math.random(),
        user: username,
        image: imageData,
        timestamp: new Date(),
        isOwn: true,
      };

      try {
        if (connection && connection.state === HubConnectionState.Connected) {
          await connection.invoke("SendImage", username, imageData);
        } else {
          saveMessageToStorage(newMessage);
          setMessages((prev) => [...prev, newMessage]);
        }
      } catch (error) {
        console.error("Failed to send image:", error);
        saveMessageToStorage(newMessage);
        setMessages((prev) => [...prev, newMessage]);
      }
    };
    reader.readAsDataURL(file);

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleTyping = async (typing: boolean) => {
    try {
      if (connection && connection.state === HubConnectionState.Connected) {
        await connection.invoke("UserTyping", username, typing);
      } else if (usingSimulatedMode) {
        localStorage.setItem(
          "chat_typing",
          JSON.stringify({ user: username, typing })
        );
      }
    } catch (error) {
      console.error("Failed to send typing indicator:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    connectToHub();
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat App</h1>
            <p className="text-gray-600">Connect with others in real-time</p>
            {usingSimulatedMode && (
              <p className="text-sm text-orange-600 mt-2">
                🧪 Simulated Mode: Open multiple browser windows to test!
              </p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose your username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full"
                onKeyPress={(e) => e.key === "Enter" && joinChat()}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">
                    {usingSimulatedMode
                      ? "Simulated mode"
                      : "Connected to server"}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-600">Connecting...</span>
                </>
              )}
            </div>

            <Button
              onClick={joinChat}
              className="w-full"
              disabled={!username.trim()}
            >
              Join Chat
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto h-screen max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <Card className="p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">Chat Room</h1>
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className="gap-1"
              >
                {isConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {usingSimulatedMode
                  ? "Simulated"
                  : isConnected
                  ? "Connected"
                  : "Demo Mode"}
              </Badge>
              {usingSimulatedMode && (
                <span className="text-xs text-orange-600">
                  Open multiple browser windows to test!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>
                {connectedUsers.length + 1} user
                {connectedUsers.length !== 0 ? "s" : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <Card className="flex-1 p-4 mb-4 overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>No messages yet. Start the conversation!</p>
                {usingSimulatedMode && (
                  <p className="text-sm mt-2">
                    💡 Open another browser window with a different username to
                    see multi-user chat!
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.isOwn
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.user}
                      </p>
                    )}

                    {msg.image ? (
                      <div className="mb-2">
                        <img
                          src={msg.image}
                          alt="Shared image"
                          className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image, "_blank")}
                        />
                      </div>
                    ) : (
                      <p className="break-words">{msg.text}</p>
                    )}

                    <p
                      className={`text-xs mt-1 ${
                        msg.isOwn ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}

            {isTyping && typingUser && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md text-sm text-gray-600">
                  <span className="font-medium">{typingUser}</span> is typing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Message Input */}
        <Card className="p-4 shadow-sm">
          <div className="flex gap-2 relative" ref={emojiPickerRef}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Image className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Smile className="w-4 h-4" />
            </Button>
            <EmojiPicker
              isOpen={showEmojiPicker}
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
            <Input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping(e.target.value.length > 0);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              onBlur={() => handleTyping(false)}
            />
            <Button
              onClick={sendMessage}
              disabled={!message.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatApp;
