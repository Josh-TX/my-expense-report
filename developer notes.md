# Developer Notes

The README is targeted for users, whereas this document is targeted towards developers (including my future self)

## About me

(as of 2024)
* I've been using Angular for about 8 years (back then it was AngularJS 1.x). 
* I've used bootstrap css for 9 years, though usually just the css. We'd use either in-house or 3rd-party js widgets. 
* I've used Express js many years ago, but most of my server-side experience is .NET.
* I've never used Angular-Material, Tailwind, or signals prior to this project
* I've never worked with Canvases or ChartJs prior to this project
* This was first time using Angular version 17, which notably introduced `@if (expr) {}` syntax, and introduced not having ngModules.

## My Thoughts on this project

* I'm glad I chose Angular, since I'm already familiar with it, and this project would've been too big to learn React or Vue.
* I like the look of Angular Material, but I regret not using ngModules. Having to import all the Angular-Material stuff each component was obnoxious. I still contemplate changin it, but the project is already done. I also dislike the appearence of the input forms. 
* I'm used to using bootstrap utility classes (text-primary, mb-4, row, col-12, etc.), and Tailwind was easy to transition to. However, Tailwind was generating some unused css, so I added a t- prefix. Not sure if this was a good idea or not. It made it more explicit when I want a tailwind class, but it was less convenient to use.
* I gradually started to use signals everywhere in my app. I have mixed feelings about it. I like the simplicity & performance of them, however, I really dislike how you don't explicitly define what signals the computed() callback is reactive to. To make my code easy to follow, I tried to reference the signal on the same line as the computed() line, but I might not have followed this convention. This convention also kinda took away the benefits of using signals, because it was always risky to synchronously access a signals value. signals also got complicated when I changed the saving & loading to be asynchronous when I added the hosted version. 

## How to debug locally

To run the browser-only version, navigate to the Angular-UI directory, install the dependencies with `npm i`, and then run `npm run start`. It should auto-open a browser tab at localhost:4200, and live-reload on code changes. 

To debug the hosted version, first navigate to the Angular-UI directory and run `npm run build-hosted`. Then copy the files from `/Angular-UI/dist-hosted/browser/*` to `/Express-server/public/*`. Then from the Express-Server directory and install the dependencies with `npm i`. Create an empty `data` directory, and then run `npm run dev`. This should run the express server, serving files from the `public` directory, and writing to the `data` directory. 
 
I generally do all my testing with just the browser-only version unless making changes to how data is saved.
 
## Automated Tests?

I don't have any. Might be something I add later if I run out of fun things to do in life. 