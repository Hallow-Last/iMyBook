class Book {

    constructor(id, title, author, year, cover, genre){

        this.id = id
        this.title = title
        this.author = author
        this.year = year
        this.cover = cover
        this.genre = genre

        this.status = "want"
        this.totalPages = 0
        this.pagesRead = 0
        this.addedAt = new Date().toISOString()
        this.lastReadAt = null
    }
}


class DiscoverPage {
    constructor(){
        this.searchBtn = document.getElementById("searchBtn")
        this.searchInput = document.getElementById("searchInput")
        this.genreSelect = document.getElementById("genreSelect")
        this.bookResults = document.getElementById("bookResults")
        this.recommendations = document.getElementById("recommendations")
        this.currentBooks = []
        this.currentGenre = ""
    }

    showMessage(target, message){
        target.textContent = ""
        let notice = document.createElement("p")
        notice.className = "empty-message"
        notice.textContent = message
        target.appendChild(notice)
    }

    async searchBooks(){

        let keyword = this.searchInput.value.trim()
        let genre = this.genreSelect.value
        if (keyword === "" && genre === ""){
            this.showMessage(this.bookResults, "Please enter a book title or select a genre.")
            this.showMessage(this.recommendations, "Choose a genre to receive book suggestions.")
            return
        }

        this.showMessage(this.bookResults, "Searching for books...")
        this.showMessage(this.recommendations, "Finding recommendations...")
        this.searchBtn.disabled = true
        let query = keyword
        if (genre !== ""){
            if (query !== ""){
                query += " "
            }
            query += "subject:" + genre
        }
        let url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(query)
        url += "&limit=12&fields=key,title,author_name,first_publish_year,edition_count,cover_i,subject"
        let controller = new AbortController()
        let timeout = setTimeout(function(){
            controller.abort()
        }, 15000)

        try {

            let response = await fetch(url, {signal: controller.signal})

            if (response.ok === false){
                let error = new Error("API request failed")
                error.status = response.status
                throw error
            }
            let data = await response.json()

            if (Array.isArray(data.docs) === false){
                throw new Error("Invalid book response")
            }

            let validBooks = []
            for (let i = 0; i < data.docs.length; i++){
                let book = data.docs[i]
                if (book === null || typeof book !== "object" ||
                    typeof book.title !== "string" || typeof book.key !== "string"){
                    continue
                }
                if (/^OL[0-9]+W$/.test(book.key)){
                    book.key = "/works/" + book.key
                }
                if (/^\/works\/OL[0-9]+W$/.test(book.key)){
                    validBooks.push(book)
                }
            }

            // Display search results
            this.currentBooks = validBooks
            this.currentGenre = genre
            this.displayBooks(validBooks, this.bookResults)
            this.recommendBooks(validBooks, genre)

        }
        catch (error){

            this.currentBooks = []
            if (error.name === "AbortError"){
                this.showMessage(this.bookResults, "Open Library took too long to respond. Please click Search to try again.")
            }
            else if (error.status === 429){
                this.showMessage(this.bookResults, "Open Library is receiving too many requests. Please wait before searching again.")
            }
            else {
                this.showMessage(this.bookResults, "Unable to contact Open Library right now. Please try Search again later.")
            }

            this.showMessage(this.recommendations, "Recommendations could not be loaded. Try another search.")
            console.error("Book search failed", error)

        }
        finally {
            clearTimeout(timeout)
            this.searchBtn.disabled = false
        }
    }



// Display Search Results


    displayBooks(books, target){

        // Clear old search results
        target.textContent = ""

        // Check whether books were found
        if (!books || books.length === 0){

            let message = document.createElement("p")
            message.className = "empty-message"
            message.textContent = "No books found. Try another search."

            target.appendChild(message)
            return
        }

        let savedBooks = bookStorage.getBooks()

        // Display books using a for loop
        for (let i = 0; i < books.length; i++){

            let book = books[i]

            // Create book card
            let card = document.createElement("div")
            card.className = "book-card"

            // The same custom app cover is used for every title.
            let cover = document.createElement("img")
            cover.src = "assets/book-cover.png"
            cover.alt = "iMyBook custom collection cover"
            cover.className = "book-cover"
            card.appendChild(cover)

            // Book information container
            let info = document.createElement("div")
            info.className = "book-info"

            // Title
            let title = document.createElement("h3")
            title.className = "book-title"

            if (book.title){
                title.textContent = book.title
            }
            else {
                title.textContent = "Unknown title"
            }

            info.appendChild(title)

            // Author
            let author = document.createElement("p")

            if (book.author_name && book.author_name.length > 0){
                author.textContent = "By " + book.author_name[0]
            }
            else {
                author.textContent = "Author unknown"
            }

            info.appendChild(author)

            // Publication year
            let year = document.createElement("p")

            if (book.first_publish_year){
                year.textContent = "Published: " + book.first_publish_year
            }
            else {
                year.textContent = "Published: Unknown"
            }

            info.appendChild(year)

            // Number of editions
            let editions = document.createElement("p")

            if (book.edition_count !== undefined){
                editions.textContent = "Editions: " + book.edition_count
            }
            else {
                editions.textContent = "Editions: Unknown"
            }

            info.appendChild(editions)

            // Book subjects
            let subject = document.createElement("p")

            if (this.currentGenre !== ""){
                let genreName = this.currentGenre.charAt(0).toUpperCase() +
                                this.currentGenre.slice(1)

                subject.textContent = "Genre: " + genreName
            }
            else if (book.subject && book.subject.length > 0){
                subject.textContent = "Subject: " + book.subject[0]
            }
            else {
                subject.textContent = "Subject: Not available"
            }

            info.appendChild(subject)
            bookDetails.displayDescription(book.key, info)

            // Match the API work ID to the locally saved book.
            let savedBook = null
            if (savedBooks !== null){
                for (let j = 0; j < savedBooks.length; j++){
                    if (savedBooks[j].id === book.key){
                        savedBook = savedBooks[j]
                        break
                    }
                }
            }

            if (savedBook !== null){
                bookDetails.displaySavedProgress(savedBook, info)
                let libraryLink = document.createElement("a")
                libraryLink.className = "saved-book-link"
                libraryLink.textContent = "View progress in My Library"
                libraryLink.href = "mybooks.html#" + encodeURIComponent(book.key)
                info.appendChild(libraryLink)
            }
            else {
                let saveBtn = document.createElement("button")
                saveBtn.className = "save-btn"
                saveBtn.textContent = "Add to Library"
                saveBtn.addEventListener("click", function(){
                    discoveryPage.saveBook(book)
                })
                info.appendChild(saveBtn)
            }

            // Add information into card
            card.appendChild(info)

            // Display card on screen
            target.appendChild(card)
        }
    }


// Book Class
    saveBook(book){

        // Get saved books from Local Storage
        let savedBooks = bookStorage.getBooks()
        if (savedBooks === null){
            return
        }

        // Check for duplicate books
        for (let i = 0; i < savedBooks.length; i++){

            if (savedBooks[i].id === book.key){
                alert("This book is already in your library.")
                return
            }
        }


        let id = book.key
        let title = "Unknown title"
        if (book.title){
            title = book.title
        }

        let author = "Unknown"

        if (book.author_name && book.author_name.length > 0){
            author = book.author_name[0]
        }

        let year = "Unknown"
        if (book.first_publish_year){
            year = book.first_publish_year
        }
        let cover = null
        if (book.cover_i){
            cover = book.cover_i
        }

        let genre = "Uncategorized"

        if (this.currentGenre !== ""){
            genre = this.currentGenre.charAt(0).toUpperCase() +
                    this.currentGenre.slice(1)
        }

        let newBook = new Book(
            id, title, author, year, cover, genre
        )

       
        savedBooks.push(newBook)

        if (bookStorage.storeBooks(savedBooks) === false){
            return
        }

        alert("Book successfully added to your library!")
        if (this.currentBooks.length > 0){
            this.displayBooks(this.currentBooks, this.bookResults)
            this.recommendBooks(this.currentBooks, this.currentGenre)
        }
    }

    recommendBooks(books, selectedGenre){
        if (selectedGenre === ""){
            this.showMessage(this.recommendations, "Choose a genre and click Search to get recommendations.")
            return
        }
        let savedBooks = bookStorage.getBooks()
        if (savedBooks === null){
            this.showMessage(this.recommendations, "Unable to read your library for recommendations.")
            return
        }
        let suggestions = []
        for (let i = 0; i < books.length; i++){
            let book = books[i]
            let matchesGenre = false
            if (Array.isArray(book.subject) === true){
                for (let j = 0; j < book.subject.length; j++){
                    if (typeof book.subject[j] === "string"){
                        let subject = book.subject[j].toLowerCase()
                        if (subject === selectedGenre || subject.indexOf(selectedGenre) !== -1){
                            matchesGenre = true
                            break
                        }
                    }
                }
            }
            let alreadySaved = false
            for (let j = 0; j < savedBooks.length; j++){
                if (savedBooks[j].id === book.key){
                    alreadySaved = true
                    break
                }
            }
            if (matchesGenre === true && alreadySaved === false){
                suggestions.push(book)
            }
            if (suggestions.length === 4){
                break
            }
        }
        if (suggestions.length === 0){
            this.showMessage(this.recommendations, "No new books matching this genre were found in these results. Try another title or genre.")
        }
        else {
            this.displayBooks(suggestions, this.recommendations)
        }
        bookStorage.storeRecommendations(suggestions, selectedGenre)
    }

    restoreRecommendations(){
        let saved = bookStorage.getRecommendations()
        if (saved !== null && saved.genre !== "" && saved.books.length > 0){
            this.genreSelect.value = saved.genre
            let library = bookStorage.getBooks()
            if (library === null){
                return
            }
            let newSuggestions = []
            for (let i = 0; i < saved.books.length; i++){
                let alreadySaved = false
                for (let j = 0; j < library.length; j++){
                    if (saved.books[i].key === library[j].id){
                        alreadySaved = true
                        break
                    }
                }
                if (alreadySaved === false){
                    newSuggestions.push(saved.books[i])
                }
            }
            if (newSuggestions.length > 0){
                this.displayBooks(newSuggestions, this.recommendations)
            }
            else {
                this.showMessage(this.recommendations, "Your last suggestions are already in your library. Search for more books.")
            }
        }
    }

}

const discoveryPage = new DiscoverPage()
discoveryPage.searchBtn.addEventListener("click", function(){
    discoveryPage.searchBooks()
})
discoveryPage.searchInput.addEventListener("keydown", function(event){
    if (event.key === "Enter"){
        discoveryPage.searchBooks()
    }
})
discoveryPage.restoreRecommendations()
