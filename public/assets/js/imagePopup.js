const modal = document.querySelector('.modal')
const previews = document.querySelectorAll('.recents a')
const previews2 = document.querySelectorAll('tbody tr')
const original = document.querySelector('.full-img')

previews.forEach(preview => {
    preview.addEventListener('click', () => {
        modal.classList.add("open")
        original.classList.add("open")
        //Dynamic change image
        const originalSrc = preview.getAttribute('data-original')
        original.src = `./assets/announcementPhotos/${originalSrc}`
    })
})

previews2.forEach(preview => {
    preview.addEventListener('click', () => {
        modal.classList.add("open")
        original.classList.add("open")
        //Dynamic change image
        const originalSrc2 = preview.getAttribute('data-original')
        original.src = `./assets/announcementPhotos/${originalSrc2}`
    })
})

modal.addEventListener('click', (e) => {
    if(e.target.classList.contains("modal")) {
        modal.classList.remove("open")
        original.classList.remove("open")
    }
})