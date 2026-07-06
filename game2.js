class Game {
  start() {
    throw new Error("Метод start() должен быть реализован в классе-наследнике");
  }
  
  update() {
    throw new Error("Метод update() должен быть реализован в классе-наследнике");
  }
}

class Tile {
  #value;
  #imgX;
  #imgY;
  
  constructor(value, imgX, imgY) {
    this.#value = value;
    this.#imgX = imgX;
    this.#imgY = imgY;
  }

  get value() { return this.#value; }
  get imgX() { return this.#imgX; }
  get imgY() { return this.#imgY; }
}

class Animation {
  #duration;
  #startTime;
  #isRunning;
  
  constructor(duration) {
    this.#duration = duration;
    this.#startTime = null;
    this.#isRunning = false;
  }
  
  start() {
    this.#isRunning = true;
    this.#startTime = null;
    this._animate();
  }
  
  _animate(timestamp) {
    if (!this.#isRunning) return;
    
    if (this.#startTime === null) {
      this.#startTime = timestamp;
    }
    
    const elapsed = timestamp - this.#startTime;
    let progress = Math.min(elapsed / this.#duration, 1);

    const easedProgress = this._ease(progress);
    
    this._onFrame(easedProgress);
    
    if (progress < 1) {
      requestAnimationFrame((t) => this._animate(t));
    } else {
      this._onComplete();
      this.#isRunning = false;
    }
  }
  
  _ease(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }
  
  _onFrame(progress) {
    throw new Error("Метод _onFrame() должен быть реализован");
  }
  
  _onComplete() {
    throw new Error("Метод _onComplete() должен быть реализован");
  }
}

class TileMoveAnimation extends Animation {
  #puzzleGame;
  #movingTile;
  #fromX;
  #fromY;
  #toX;
  #toY;
  #emptyIndex;
  #index;
  
  constructor(puzzleGame, movingTile, fromX, fromY, toX, toY, emptyIndex, index) {
    super(200);
    this.#puzzleGame = puzzleGame;
    this.#movingTile = movingTile;
    this.#fromX = fromX;
    this.#fromY = fromY;
    this.#toX = toX;
    this.#toY = toY;
    this.#emptyIndex = emptyIndex;
    this.#index = index;
  }
  
  _onFrame(progress) {
    const currentX = this.#fromX + (this.#toX - this.#fromX) * progress;
    const currentY = this.#fromY + (this.#toY - this.#fromY) * progress;
    this.#puzzleGame.drawWithMovingTile(this.#movingTile, currentX, currentY);
  }
  
  _onComplete() {
    this.#puzzleGame.completeMove(this.#emptyIndex, this.#index, this.#movingTile);
  }
}

class PuzzleGame extends Game {
  #canvas;
  #ctx;
  #size;
  #tileSize;
  #tiles;
  #moves;
  #time;
  #timer;
  #currentImage;
  #imageName;
  #isAnimating;
  #movesSpan;
  #timerSpan;
  #scores;
  #animation;
  
  constructor() {
    super();
    this.#canvas = document.getElementById('game');
    this.#ctx = this.#canvas.getContext('2d');
    this.#size = 4;
    this.#tileSize = this.#canvas.width / this.#size;
    
    this.#tiles = [];
    this.#moves = 0;
    this.#time = 0;
    this.#timer = null;
    this.#currentImage = null;
    this.#imageName = "Своя картинка";
    this.#isAnimating = false;
    this.#animation = null;
    
    this.#movesSpan = document.getElementById('moves');
    this.#timerSpan = document.getElementById('timer');
    
    this.#scores = JSON.parse(localStorage.getItem('puzzle_scores')) || [];
    
    this._initEventListeners();
    this.showImageSelector();
  }
  
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }
  get size() { return this.#size; }
  get tileSize() { return this.#tileSize; }
  get currentImage() { return this.#currentImage; }
  get tiles() { return this.#tiles; }
  get isAnimating() { return this.#isAnimating; }
  
  set isAnimating(value) { this.#isAnimating = value; }
  
  start() {
    if (!this.#currentImage) return;
    this._startNewGame();
  }
  
  update() {
    this.draw();
  }
  
  drawWithMovingTile(movingTile, currentX, currentY) {
    this._drawStaticField();
    
    this.#ctx.drawImage(
      this.#currentImage,
      movingTile.imgX, movingTile.imgY, this.#tileSize, this.#tileSize,
      currentX, currentY, this.#tileSize, this.#tileSize
    );
    
    this.#ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.#ctx.lineWidth = 2;
    this.#ctx.strokeRect(currentX + 1, currentY + 1, this.#tileSize - 3, this.#tileSize - 3);
  }
  
  completeMove(emptyIndex, index, movingTile) {
    this.#tiles[emptyIndex] = movingTile;
    this.#isAnimating = false;
    this.#moves++;
    this.#movesSpan.textContent = `Ходы: ${this.#moves}`;
    this.draw();
    this._checkWin();
  }
  
  draw() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    
    this.#tiles.forEach((tile, idx) => {
      const x = (idx % this.#size) * this.#tileSize;
      const y = Math.floor(idx / this.#size) * this.#tileSize;
      
      if (tile === null) {
        this.#ctx.fillStyle = '#d4d4d4';
        this.#ctx.fillRect(x + 1, y + 1, this.#tileSize - 2, this.#tileSize - 2);
        return;
      }
      
      this.#ctx.drawImage(
        this.#currentImage,
        tile.imgX, tile.imgY, this.#tileSize, this.#tileSize,
        x, y, this.#tileSize, this.#tileSize
      );
      
      this.#ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      this.#ctx.lineWidth = 2;
      this.#ctx.strokeRect(x + 1, y + 1, this.#tileSize - 3, this.#tileSize - 3);
    });
  }
  
  showImageSelector() {
    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('imageSelector').classList.remove('hidden');
    
    const container = document.getElementById('imagesContainer');
    container.innerHTML = '';
    
    const images = [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/DSC07437-%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%9A%D1%80%D0%B5%D0%BC%D0%BB%D1%8C.jpg/1280px-DSC07437-%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%9A%D1%80%D0%B5%D0%BC%D0%BB%D1%8C.jpg', name: 'Московский Кремль' },
      { url: 'https://avatars.mds.yandex.net/get-mpic/5177644/img_id6403025201893648734.jpeg/orig', name: 'Цветы' },
      { url: 'https://avatars.mds.yandex.net/i?id=100b09845dbd35ac57e27b92303aee53_l-5220205-images-thumbs&n=13', name: 'Красная панда' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/%D0%AD%D0%BB%D1%8C%D0%B1%D1%80%D1%83%D1%81_%D1%81_%D1%81%D0%B5%D0%B2%D0%B5%D1%80%D0%B0.jpg/1920px-%D0%AD%D0%BB%D1%8C%D0%B1%D1%80%D1%83%D1%81_%D1%81_%D1%81%D0%B5%D0%B2%D0%B5%D1%80%D0%B0.jpg', name: 'Эльбрус' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/1280px-Telegram_logo.svg.png', name: 'TG' },
      { url: 'https://avatars.mds.yandex.net/i?id=e0aad67b0383eb7883894293901a6711_l-7083384-images-thumbs&n=13', name: 'DSTU' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/At_sign.svg/1280px-At_sign.svg.png', name: '@' },
      { url: 'https://avatars.mds.yandex.net/i?id=0d6a9dddf75355a86125b04fd7f85bec_l-9831149-images-thumbs&n=13', name: 'WI-FI' }
    ];
    
    images.forEach(img => {
      const el = document.createElement('img');
      el.src = img.url;
      el.title = img.name;
      el.style.width = '100%';
      el.style.maxWidth = '180px';
      el.style.borderRadius = '10px';
      el.style.cursor = 'pointer';
      el.style.margin = '8px';
      el.addEventListener('click', () => this._loadPredefinedImage(img.url, img.name));
      container.appendChild(el);
    });
  }
  
  showScoreboard() {
    const tbody = document.getElementById('scoreTable');
    tbody.innerHTML = '';
    
    this.#scores.forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.moves}</td>
        <td>${s.time}</td>
        <td>${s.size || '4x4'}</td>
        <td>${s.image}</td>
      `;
      tbody.appendChild(tr);
    });
    
    document.getElementById('scoreboard').classList.remove('hidden');
  }
  
  showOriginalImage() {
    if (!this.#currentImage) {
      alert("Картинка ещё не загружена");
      return;
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.#canvas.width;
    tempCanvas.height = this.#canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.#canvas, 0, 0);
    
    this.#ctx.drawImage(this.#currentImage, 0, 0, this.#canvas.width, this.#canvas.height);
    
    setTimeout(() => {
      this.draw();
    }, 5000);
  }
  
  _initEventListeners() {
    document.getElementById('showScoresFromSelector').addEventListener('click', () => this.showScoreboard());
    this.#canvas.addEventListener('click', (e) => this._handleClick(e));
    document.getElementById('newGame').addEventListener('click', () => this.start());
    document.getElementById('changeImage').addEventListener('click', () => this.showImageSelector());
    document.getElementById('showScores').addEventListener('click', () => this.showScoreboard());
    document.getElementById('showOriginal').addEventListener('click', () => this.showOriginalImage());
    document.getElementById('closeScores').addEventListener('click', () => {
      document.getElementById('scoreboard').classList.add('hidden');
    });
    
    document.getElementById('difficulty').addEventListener('change', (e) => {
      this.#size = parseInt(e.target.value);
      this.#tileSize = this.#canvas.width / this.#size;
      if (this.#currentImage) {
        this.start();
      }
    });
    
    document.getElementById('imageUpload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this._loadUserImage(file);
    });
  }
  
  _loadPredefinedImage(url, name) {
    this.#imageName = name;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.#currentImage = this._makeSquareImage(img);
      this._hideSelectorAndStart();
    };
    img.onerror = () => alert("Не удалось загрузить картинку. Попробуйте другую.");
    img.src = url;
  }
  
  _loadUserImage(file) {
    if (!file.type.startsWith('image/')) {
      alert("Выберите файл изображения!");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.#currentImage = this._makeSquareImage(img);
        this.#imageName = file.name.split('.')[0] || "Моя картинка";
        this._hideSelectorAndStart();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  _makeSquareImage(img) {
    const targetSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    const imgRatio = img.width / img.height;
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgRatio > 1) {
      drawHeight = targetSize;
      drawWidth = img.width * (targetSize / img.height);
      offsetX = (targetSize - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = targetSize;
      drawHeight = img.height * (targetSize / img.width);
      offsetX = 0;
      offsetY = (targetSize - drawHeight) / 2;
    }
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    return canvas;
  }
  
  _hideSelectorAndStart() {
    document.getElementById('imageSelector').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    this.start();
  }
  
  _startNewGame() {
    if (!this.#currentImage) return;
    
    this.#moves = 0;
    this.#time = 0;
    this.#movesSpan.textContent = "Ходы: 0";
    this.#timerSpan.textContent = "Время: 0 сек";
    
    clearInterval(this.#timer);
    this.#timer = setInterval(() => {
      this.#time++;
      this.#timerSpan.textContent = `Время: ${this.#time} сек`;
    }, 1000);
    
    this._createTiles();
    this._shuffleTiles();
    this.draw();
  }
  
  _createTiles() {
    this.#tiles = [];
    const ts = this.#tileSize;
    
    for (let i = 0; i < this.#size; i++) {
      for (let j = 0; j < this.#size; j++) {
        const value = i * this.#size + j + 1;
        if (value === this.#size * this.#size) {
          this.#tiles.push(null);
        } else {
          this.#tiles.push(new Tile(value, j * ts, i * ts));
        }
      }
    }
  }
  
  _drawStaticField() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    
    this.#tiles.forEach((tile, idx) => {
      const x = (idx % this.#size) * this.#tileSize;
      const y = Math.floor(idx / this.#size) * this.#tileSize;
      
      if (tile === null) {
        this.#ctx.fillStyle = '#d4d4d4';
        this.#ctx.fillRect(x + 1, y + 1, this.#tileSize - 2, this.#tileSize - 2);
      } else {
        this.#ctx.drawImage(
          this.#currentImage,
          tile.imgX, tile.imgY, this.#tileSize, this.#tileSize,
          x, y, this.#tileSize, this.#tileSize
        );
        this.#ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.#ctx.lineWidth = 2;
        this.#ctx.strokeRect(x + 1, y + 1, this.#tileSize - 3, this.#tileSize - 3);
      }
    });
  }
  
  _handleClick(e) {
    if (this.#isAnimating) return;
    
    const rect = this.#canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.#tileSize);
    const y = Math.floor((e.clientY - rect.top) / this.#tileSize);
    
    if (x >= 0 && x < this.#size && y >= 0 && y < this.#size) {
      const index = y * this.#size + x;
      this._moveTile(index);
    }
  }
  
  _moveTile(index) {
    if (this.#isAnimating) return;
    
    const emptyIndex = this.#tiles.indexOf(null);
    if (!this._isValidMove(emptyIndex, index)) return;
    
    const movingTile = this.#tiles[index];
    if (!movingTile) return;
    
    this.#tiles[index] = null;
    
    const fromX = (index % this.#size) * this.#tileSize;
    const fromY = Math.floor(index / this.#size) * this.#tileSize;
    const toX = (emptyIndex % this.#size) * this.#tileSize;
    const toY = Math.floor(emptyIndex / this.#size) * this.#tileSize;
    
    this.#isAnimating = true;
    this.#animation = new TileMoveAnimation(this, movingTile, fromX, fromY, toX, toY, emptyIndex, index);
    this.#animation.start();
  }
  
  _isValidMove(emptyIndex, index) {
    const row1 = Math.floor(emptyIndex / this.#size), col1 = emptyIndex % this.#size;
    const row2 = Math.floor(index / this.#size), col2 = index % this.#size;
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }
  
  _shuffleTiles() {
    for (let i = 0; i < 1000; i++) {
      const emptyIndex = this.#tiles.indexOf(null);
      const directions = [-1, 1, -this.#size, this.#size];
      const possible = directions
        .map(d => emptyIndex + d)
        .filter(pos => pos >= 0 && pos < this.#size * this.#size)
        .filter(pos => {
          const r1 = Math.floor(emptyIndex / this.#size);
          const c1 = emptyIndex % this.#size;
          const r2 = Math.floor(pos / this.#size);
          const c2 = pos % this.#size;
          return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
        });
      
      if (possible.length > 0) {
        const randomMove = possible[Math.floor(Math.random() * possible.length)];
        [this.#tiles[randomMove], this.#tiles[emptyIndex]] = [this.#tiles[emptyIndex], this.#tiles[randomMove]];
      }
    }
  }
  
  _checkWin() {
    for (let i = 0; i < this.#tiles.length - 1; i++) {
      if (this.#tiles[i] && this.#tiles[i].value !== i + 1) return;
    }
    
    clearInterval(this.#timer);
    setTimeout(() => {
      const name = prompt(`Победа!\nХоды: ${this.#moves}, Время: ${this.#time} сек\nРазмер: ${this.#size}x${this.#size}\n\nВаше имя:`, "Игрок");
      if (name) this._saveScore(name.trim() || "Игрок");
    }, 200);
  }
  
  _saveScore(name) {
    this.#scores.push({
      name,
      moves: this.#moves,
      time: this.#time,
      size: `${this.#size}x${this.#size}`,
      image: this.#imageName
    });
    
    this.#scores.sort((a, b) => a.moves - b.moves || a.time - b.time);
    this.#scores = this.#scores.slice(0, 10);
    localStorage.setItem('puzzle_scores', JSON.stringify(this.#scores));
  }
}

new PuzzleGame();