// const modal = document.querySelector('.modal')
// const previews = document.querySelectorAll('.recents a')
// const previews2 = document.querySelectorAll('tbody tr')
// const original = document.querySelector('.full-img')

// previews.forEach(preview => {
//     preview.addEventListener('click', () => {
//         modal.classList.add("open")
//         original.classList.add("open")
//         //Dynamic change image
//         const originalSrc = preview.getAttribute('data-original')
//         original.src = `./assets/announcementPhotos/${originalSrc}`
//     })
// })

// previews2.forEach(preview => {
//     preview.addEventListener('click', () => {
//         modal.classList.add("open")
//         original.classList.add("open")
//         //Dynamic change image
//         const originalSrc2 = preview.getAttribute('data-original')
//         original.src = `./assets/announcementPhotos/${originalSrc2}`
//     })
// })

// modal.addEventListener('click', (e) => {
//     if(e.target.classList.contains("modal")) {
//         modal.classList.remove("open")
//         original.classList.remove("open")
//     }
// })

// const modal = document.querySelector('.modal')
// const previews = document.querySelectorAll('.recents a')
// const previews2 = document.querySelectorAll('tbody tr')
// const original = document.querySelector('.full-img')

// previews.forEach(preview => {
//     preview.addEventListener('click', () => {
//         modal.classList.add("open")
//         original.classList.add("open")
//         //Dynamic change image
//         const originalSrc = preview.getAttribute('data-original')
//         original.src = __dirname + `/uploads/${originalSrc}`
//     })
// })

// previews2.forEach(preview => {
//     preview.addEventListener('click', () => {
//         modal.classList.add("open")
//         original.classList.add("open")
//         //Dynamic change image
//         const originalSrc2 = preview.getAttribute('data-original')
//         original.src = __dirname + `/uploads/${originalSrc2}`
//     })
// })

// modal.addEventListener('click', (e) => {
//     if(e.target.classList.contains("modal")) {
//         modal.classList.remove("open")
//         original.classList.remove("open")
//     }
// })


const modal = document.querySelector('.imgModal');
const previews = document.querySelectorAll('.displayCouples');
const original = document.querySelector('.full-img');
const previews2 = document.querySelectorAll('.view')

previews.forEach(preview => {
  preview.addEventListener('click', () => {
    modal.classList.add("open");
    original.classList.add("open");
    let originalSrc = preview.getAttribute('data-original');
    console.log('ImageString='+originalSrc)
    //originalSrc=atob(originalSrc)
    //console.log('Converted imageString='+originalSrc)
    original.src = 'data:image/jpg;base64,'+originalSrc;
    console.log('ImageData='+originalSrc)
  });
});

previews2.forEach(preview => {
    preview.addEventListener('click', () => {
        modal.classList.add("open");
        original.classList.add("open");
        let originalSrc = preview.getAttribute('data-original');
        // console.log('ImageString='+originalSrc)
        //originalSrc=atob(originalSrc)
        //console.log('Converted imageString='+originalSrc)
        original.src = 'data:image/jpg;base64,'+originalSrc;
        // console.log('ImageData='+originalSrc)
      });
})


modal.addEventListener('click', (e) => {
  if(e.target.classList.contains("imgModal")) {
    modal.classList.remove("open");
    original.classList.remove("open");
  }
});

original.addEventListener('click', (e) => {
    if(e.target.classList.contains("full-img")) {
      modal.classList.remove("open");
      original.classList.remove("open");
    }
  });


// const modal = document.querySelector('.modal');
// const previews = document.querySelectorAll('tbody tr');
// const original = document.querySelector('.full-img');

// previews.forEach(preview => {
//   preview.addEventListener('click', () => {
//     modal.classList.add("open");
//     original.classList.add("open");
//     const originalData = preview.getAttribute('data-original');
//     const blob = new Blob([originalData], {type: 'image/jpeg'});
//     const originalSrc = URL.createObjectURL(blob);
//     original.src = originalSrc;
//     console.log(originalSrc);
//   });
// });

// modal.addEventListener('click', (e) => {
//   if(e.target.classList.contains("modal")) {
//     modal.classList.remove("open");
//     original.classList.remove("open");
//   }
// });

