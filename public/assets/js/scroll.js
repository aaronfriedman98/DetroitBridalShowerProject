const scroll = document.querySelector("#scroll")
const scroll2 = document.querySelector("#scroll2")
const scroll3 = document.querySelector("#scroll3")


window.addEventListener('scroll', () => {
    if (window.scrollY >= 150) {
        scroll.classList.add('disappear')
        // scroll2.classList.add('appear')
        // scroll3.classList.add('appear')
    }
    else {
        scroll.classList.remove('disappear')
        // scroll2.classList.remove('appear')
        // scroll3.classList.remove('appear')
    }
})
window.addEventListener('scroll', () => {
    if (window.scrollY >= 700 && window.scrollY < 900) {
        scroll3.classList.add('appear')
        scroll2.classList.add('appear')
    }
    else {
        scroll3.classList.remove('appear')
        scroll2.classList.remove('appear')
    }
})
window.addEventListener('scroll', () => {
    if (window.scrollY >= 850) {
        scroll2.classList.remove('appear')
    }
    // else {
    //     scroll2.classList.add('appear')
    // }
})
// function myDeskFunction(y) {
//     if (y.matches) {
//         window.addEventListener('scroll', () => {
//             if (window.scrollY >= 200) {
//                 scroll.classList.add('disappear')
//                 // scroll2.classList.add('appear')
//             }
//             else {
//                 scroll.classList.remove('disappear')
//                 // scroll2.classList.remove('appear')
//             }
//         })
//     }
// }
// let y = window.matchMedia("(min-width: 750px)")
// myDeskFunction(y)

// function myDeskFunction(x) {
//     if (x.matches) {
//         window.addEventListener('scroll', () => {
//             if (window.scrollY >= 900) {
//                 // scroll.classList.add('disappear')
//                 scroll2.classList.add('appear')
//             }
//             else {
//                 // scroll.classList.remove('disappear')
//                 scroll2.classList.remove('appear')
//             }
//         })
//     }
// }
// let x = window.matchMedia("(min-width: 750px)")
// myDeskFunction(x)