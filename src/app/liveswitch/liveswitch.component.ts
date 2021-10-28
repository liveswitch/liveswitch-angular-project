import { Component, OnInit } from '@angular/core';
import fmLiveswitch from 'fm.liveswitch';
import { Config } from "src/app/liveswitch/liveswitch.config";

@Component({
  selector: 'app-liveswitch',
  templateUrl: './liveswitch.component.html',
  styleUrls: ['./liveswitch.component.css']
})
export class LiveswitchComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }
  // 1. Make sure you supply values in the Config. 
  private config: Config = new Config();
  // 2. Define the local media (webcam and microphone source)
  private localMedia: fmLiveswitch.LocalMedia | null = null;
  // 3. Define the client to connect to the signalling server.
  private client: fmLiveswitch.Client | null = null;
  // 4. We will need a register token to register the client to the signalling server.
  private token: string = "";
  // 5. Lets keep a ledger of all the channels we are currently in. Will make life easier.
  private channels: fmLiveswitch.Channel[] | null = null;
  // 6. The layout manager isnt required, but it will give us a nice clean layout automatically.
  private layoutManager: fmLiveswitch.DomLayoutManager | null = null;

  // Public logs to display on screen. Developer logs will go to console. 
  private logContainer: HTMLDivElement | null = null;
  private async log(message: string) {
    let p: HTMLParagraphElement = document.createElement("p") as HTMLParagraphElement;
    p.innerHTML = message;
    this.logContainer?.appendChild(p);
  }

  public async run() {
    this.log("Welcome to your new Angular LiveSwitch Application. Please make sure to fill out the app.config.ts before running.");
    // Set up debug logging to console.
    fmLiveswitch.Log.registerProvider(new fmLiveswitch.ConsoleLogProvider(fmLiveswitch.LogLevel.Debug));

    // Set up the layout manager to handle our layouts for us. 
    let videoContainer: HTMLDivElement = document.getElementById("videoContainer") as HTMLDivElement;
    this.layoutManager = new fmLiveswitch.DomLayoutManager(videoContainer);
    // A super easy way to adjust the layout.  
    this.layoutManager.applyPreset(fmLiveswitch.LayoutPreset.getFacetime());
    // You can add the elements to the page yourself by calling localMedia.getView() and remoteMedia.getView() and adding the HTML elements to the document. 

    // 1. Lets start up our localMedia context.
    try {
      // 1a. Lets create a new instance of the Local Media class and request microphone and webcam access. 
      this.localMedia = new fmLiveswitch.LocalMedia(false,
        {
          video: {
            width: {
              ideal: 640,
              max: 1920
            },
            height: {
              ideal: 480,
              max: 1080
            }
          }
        });

      // 1b. Start the local media, will request microphone and webcam access from the user. 
      await this.localMedia.start();
      // 1c. Lets display our local preview, so we can see ourselves. This isn't required.
      this.layoutManager.setLocalView(this.localMedia.getView());

    } catch (localMediaException) {

      // Logs to display.
      this.log("Error starting local media context. Aborting application.");
      // Stops application.
      return;
    }

    // 2. Lets create the client and sign them up for signalling. This will connect the user to the LiveSwitch Gateway.
    try {
      // 2a. First we need a userId and deviceId for this user.
      this.config.deviceId = "AngularDemoWebBrowserClient";
      // For HIPPA compliance, its best to not make the userId something publically identifiable.
      this.config.userId = fmLiveswitch.Guid.newGuid().toString(); // Creates a new GUID as the UserID.
      // 2b. Lets create the client class. We need to supply some of the values from our config. 
      this.client = new fmLiveswitch.Client(this.config.gatewayURL, this.config.applicationId, this.config.userId, this.config.deviceId);
      // 2c. Lets create the channels we want to auto join the user to. Users can also join via join tokens later.
      // *NOTE* ChannelClaim objects have a lot of security permissions you can set for the user. 
      let primaryChannel = new fmLiveswitch.ChannelClaim("myChannelId");
      primaryChannel.setDisableSendVideo(false);
      primaryChannel.setDisableSendAudio(false);
      let channelClaims: fmLiveswitch.ChannelClaim[] = [primaryChannel];
      // 2d. Lets create a token (WARNING: THIS ALWAYS SHOULD BE DONE SERVER SIDE. CLIENT SIDE ONLY FOR THE DEMO!)
      this.token = fmLiveswitch.Token.generateClientRegisterToken(this.client, channelClaims, this.config.sharedSecret);
      // 2e. Lets register the client to the signalling server using our new token.
      // At the same time the channels we specified above will be returned once auto joined. 
      this.channels = await this.client.register(this.token);
      if (this.channels === null) {
        throw new Error("Client register did not join any channels, you must join a channel to continue.");
      }
    } catch (clientException) {
      // Logs to display.
      this.log("Error starting the client. Aborting application.");
      // Stops application.
      return;
    }

    // 3. Lets Open Downstreams (recv) to other users.
    // *NOTE* this example does not show you datastreams. 
    let openDownstreamConnection = async (remoteConnectionInfo: fmLiveswitch.ConnectionInfo, channel: fmLiveswitch.Channel): Promise<fmLiveswitch.SfuDownstreamConnection | null> => {
      // Houses the audio / video for the other users connection.
      let remoteMedia: fmLiveswitch.RemoteMedia = new fmLiveswitch.RemoteMedia();
      // Add this remote media to our webpage and have the LayoutManager lay it out.
      this.layoutManager?.addRemoteMedia(remoteMedia);
      // If the other user has audio, lets create a audio stream for it.
      let audioStream: fmLiveswitch.AudioStream | null = (remoteConnectionInfo.getHasAudio()) ? new fmLiveswitch.AudioStream(remoteMedia) : null;
      // If the other user has video, lets create a video stream for it. 
      let videoStream: fmLiveswitch.VideoStream | null = (remoteConnectionInfo.getHasVideo()) ? new fmLiveswitch.VideoStream(remoteMedia) : null;
      // Lets create the downstream connection to connect to the server with.
      let sfuDownstreamConnection: fmLiveswitch.SfuDownstreamConnection;
      if (audioStream != null && videoStream != null) {
        sfuDownstreamConnection = channel.createSfuDownstreamConnection(remoteConnectionInfo, audioStream!, videoStream!);
      } else if (audioStream != null) {
        sfuDownstreamConnection = channel.createSfuDownstreamConnection(remoteConnectionInfo, audioStream!);
      } else if (videoStream != null) {
        sfuDownstreamConnection = channel.createSfuDownstreamConnection(remoteConnectionInfo, videoStream!);
      } else {
        return null;
      }

      // Subscribe to downstream connection state changes. 
      sfuDownstreamConnection.addOnStateChange((conn: any) => {
        fmLiveswitch.Log.debug(`Downstream connection is ${new fmLiveswitch.ConnectionStateWrapper(conn.getState()).toString()}.`);
        this.log(`Downstream connection is ${new fmLiveswitch.ConnectionStateWrapper(conn.getState()).toString()}.`);

        // If the user closed thier Upstream connection, lets remove it from our webpage. 
        if (conn.getRemoteClosed()) {
          this.layoutManager?.removeRemoteMedia(remoteMedia);
          remoteMedia.destroy();
        }
      });

      await sfuDownstreamConnection.open();
      return sfuDownstreamConnection;
    };

    // 3a. Loop all the existing SFU Upstream connections and open downstreams to them.
    this.channels!.forEach(channel => {
      channel.getRemoteUpstreamConnectionInfos().forEach((conn: any) => {
        openDownstreamConnection(conn, channel);
      });
    });

    // 3b. Subscribe to an event to open a downstream when a new user opens a fresh one. 
    // This will fire when a user opens a new SFU upstream connection in one of the channels we belong to. 
    this.channels!.forEach(channel => {
      channel.addOnRemoteUpstreamConnectionOpen((remoteConnectionInfo: fmLiveswitch.ConnectionInfo) => openDownstreamConnection(remoteConnectionInfo, channel));
    });

    // 3c. Subscribe to signalling events for client join / leave (does not have to do with SFU connections.)
    this.channels!.forEach(channel => {
      channel.addOnRemoteClientJoin((client: fmLiveswitch.ClientInfo) => {
        this.log(`Client joined the channel ${channel.getId()} :: ${client.getUserId()}`);
      });
      channel.addOnRemoteClientLeave((client: fmLiveswitch.ClientInfo) => {
        this.log(`Client left the channel ${channel.getId()} :: ${client.getUserId()}`);
      });
    });


    // 4. Lets open our Upstream (send) connection to start sharing out our video.
    // *NOTE* this example does not show you datastreams. 
    let openUpstreamConnection = async (localMedia: fmLiveswitch.LocalMedia, channel: fmLiveswitch.Channel): Promise<fmLiveswitch.SfuUpstreamConnection | null> => {
      // If we opened audio above, we need a audio stream.
      // https://developer.liveswitch.io/reference/ts/api/classes/fm.liveswitch.audiostream.html
      let audioStream: fmLiveswitch.AudioStream | null = (localMedia.getAudioTrack() != null) ? new fmLiveswitch.AudioStream(localMedia) : null;
      // If we opened video above, we need a video stream.
      // https://developer.liveswitch.io/reference/ts/api/classes/fm.liveswitch.videostream.html
      let videoStream: fmLiveswitch.VideoStream | null = (localMedia.getVideoTrack() != null) ? new fmLiveswitch.VideoStream(localMedia) : null;

      let sfuUpstreamConnection: fmLiveswitch.SfuUpstreamConnection;
      if (audioStream != null && videoStream != null) {
        sfuUpstreamConnection = channel.createSfuUpstreamConnection(audioStream!, videoStream!);
      } else if (audioStream != null) {
        sfuUpstreamConnection = channel.createSfuUpstreamConnection(audioStream!);
      } else if (videoStream != null) {
        sfuUpstreamConnection = channel.createSfuUpstreamConnection(videoStream!);
      } else {
        return null;
      }
      // Logs out the connection status as it changes.
      sfuUpstreamConnection.addOnStateChange((conn: any) => {
        fmLiveswitch.Log.debug(`Upstream connection is ${new fmLiveswitch.ConnectionStateWrapper(conn.getState()).toString()}.`);
        this.log(`Upstream connection is ${new fmLiveswitch.ConnectionStateWrapper(conn.getState()).toString()}.`);
      });
      // Opens the connection to the server.
      await sfuUpstreamConnection.open();

      return sfuUpstreamConnection;
    }
    // We only auto joined a single channel, we can just supply that one to this method. 
    openUpstreamConnection(this.localMedia, this.channels![0]);
  }

  ngAfterViewInit() {
    this.logContainer = document.getElementById("logContainer") as HTMLDivElement;
    setTimeout(() => this.run());
  }

}
