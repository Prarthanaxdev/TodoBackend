// module.exports = {
//     firebaseConfig : {
//         apiKey: "AIzaSyD6lcRnk_hbBf3xDMhPZCX5rK9JaSsSVAM",
//         authDomain: "test-47c34.firebaseapp.com",
//         projectId: "test-47c34",
//         storageBucket: "test-47c34.appspot.com",
//         messagingSenderId: "20668071512",
//         appId: "1:20668071512:web:6ff676ba9700d31b95d42d",
//         measurementId: "G-PXTCZDMMCK"
//     }
// }

const firebase = require('firebase')
// const { firestore } = require('firebase-admin')

const firebaseConfig = {
    apiKey: "AIzaSyD6lcRnk_hbBf3xDMhPZCX5rK9JaSsSVAM",
    authDomain: "test-47c34.firebaseapp.com",
    projectId: "test-47c34",
    storageBucket: "test-47c34.appspot.com",
    messagingSenderId: "20668071512",
    appId: "1:20668071512:web:6ff676ba9700d31b95d42d",
    measurementId: "G-PXTCZDMMCK"
}

const db = firebase.initializeApp(firebaseConfig);

module.exports = db
