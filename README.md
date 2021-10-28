# LiveSwitch Angular Project Example

This repository includes the source code for setting up an Angular project using the LiveSwitch Web SDK to stream video.

## Tools You Need

Angular CLI version 12.2.7+

## Add an Application in LiveSwitch

Before you can run the app, you must add an Application in the LiveSwitch Console.

1. Log into the [LiveSwitch Console](https://console.liveswitch.io/). If you don't have an account, [contact us](mailto:sales@liveswitch.io) about trying out LiveSwitch.
1. Click **Applications** > **New**.
1. Enter a name for your Application.
1. Click the Application you just created to open the **Application Settings** page. You can find your Application ID and Shared Secret there. This information is needed for [generating your authorization token](xref:token).

## Run the App

1. Check out this repository and update `/src/app/liveswitch/liveswitch.config.ts` with your own Application ID and Shared Secret.
1. Install all the dependencies:

   ```
   npm install
   ```

1. Run the app:

   ```
   ng serve
   ```
1. Navigate to `http://localhost:4200/`. You should see video streaming on the web page. To emulate a video conference with multiple participants, open the page in multiple browser windows or tabs.

For a more detailed set up, visit [LiveSwitch's documentation](https://developer.liveswitch.io/liveswitch-cloud/get-started/js/set-up-a-liveswitch-angular-project.html).
