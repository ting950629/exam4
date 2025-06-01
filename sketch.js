let video;
let handpose;
let predictions = [];

let questions = [
  {text: "教科系主要研究教育科技與課程設計。", answer: true, explain: "正確，這是教科系的核心領域。"},
  {text: "教科系畢業只能當小學老師，不能從事其他行業。", answer: false, explain: "錯誤，畢業後可從事多元教育與科技相關工作。"},
  {text: "教科系學生會學習數位教材製作與教學媒體應用。", answer: true, explain: "正確，這是教科系的重要課程。"},
  {text: "教科系不需要學習心理學相關課程。", answer: false, explain: "錯誤，心理學是教育相關科系的基礎課程之一。"},
  {text: "教科系也會接觸到學習評量與教育統計。", answer: true, explain: "正確，這是教科系的必修內容。"},
  {text: "教科系的學生都必須會寫程式。", answer: false, explain: "錯誤，雖然有資訊課程，但不要求每位學生都會寫程式。"},
  {text: "教科系學生可以參與教育科技相關的專題研究。", answer: true, explain: "正確，專題研究是學習的一部分。"},
  {text: "教科系只重視理論，不重視實作。", answer: false, explain: "錯誤，教科系強調理論與實作並重。"}
];
let current = 0;
let feedback = "";
let score = 0;
let gameOver = false;
let lastGesture = ""; // 防止重複判斷
let stars = [];

function setup() {
  createCanvas(800, 600);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", results => {
    predictions = results;
  });

  textAlign(CENTER, CENTER);
  textSize(28);

  // 初始化星星
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(1, 3),
      alpha: random(100, 255),
      speed: random(0.01, 0.03)
    });
  }
}

function modelReady() {
  console.log("Handpose model loaded!");
}

function draw() {
  // 粉紅色漸層背景
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color(255,182,193), color(255,240,245), inter); // 粉紅到淡粉
    stroke(c);
    line(0, y, width, y);
  }

  // 畫星星
  noStroke();
  for (let i = 0; i < stars.length; i++) {
    let s = stars[i];
    fill(255, 255, 255, s.alpha + 50 * sin(frameCount * s.speed + i));
    ellipse(s.x, s.y, s.r, s.r);
  }

  // 攝影機畫面加圓角與陰影
  push();
  translate(width, 0);
  scale(-1, 1);
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = color(255, 105, 180, 80); // 粉紅陰影
  image(video, (width-640)/2, 40, 640, 480); // 修正這一行
  drawingContext.shadowBlur = 0;
  pop();

  // 題目卡片（藍色邊框）
  fill(230, 240, 255, 230); // 淡藍底
  stroke(70, 130, 255);     // 藍色邊框
  strokeWeight(4);
  rectMode(CENTER);
  rect(width/2, 500, 600, 160, 40); // y座標往下移，避免擋到畫面

  // 題目文字
  noStroke();
  fill(30, 80, 200); // 深藍
  let baseSize = 28;
  let minSize = 16;
  let maxTextWidth = 540; // 比卡片寬度600略小
  let displayText = "";
  if (current < questions.length) {
    displayText = "\"" + questions[current].text + "\"";
    textSize(baseSize);
    // 動態縮小字體直到不超出卡片
    while (textWidth(displayText) > maxTextWidth && baseSize > minSize) {
      baseSize -= 1;
      textSize(baseSize);
    }
    text(displayText, width/2, 500);
  }

  // 標題
  textSize(32);
  fill(255, 20, 147); // 粉紅
  textStyle(BOLD);
  text("教科小遊戲", width/2, 60);
  textStyle(NORMAL);

  // 選項提示
  textSize(22);
  fill(199, 21, 133); // 粉紅
  text("比 👍（大拇指朝上）= 真", width/2-150, 570);
  text("比 👎（大拇指朝下）= 假", width/2+150, 570);

  // 分數
  fill(255, 240, 245, 220); // 淡粉底
  stroke(255, 105, 180);
  strokeWeight(2);
  rect(width-110, 40, 120, 50, 20);
  noStroke();
  fill(255, 20, 147);
  textSize(22);
  text("分數：" + score, width-110, 40);

  // 遊戲結束畫面
  if (gameOver) {
    fill(255,240,245,240);
    stroke(255,105,180);
    strokeWeight(4);
    rect(width/2, height/2, 400, 200, 40);
    noStroke();
    fill(255, 20, 147);
    textSize(32);
    text("遊戲結束！你的分數：" + score + "/" + questions.length, width/2, height/2-30);
    fill(199, 21, 133);
    textSize(22);
    text("請按 R 鍵重新開始", width/2, height/2+30);
    return;
  }

  // 回饋
  fill(255,240,245,220);
  stroke(255,182,193);
  strokeWeight(2);
  rect(width/2, 620, 500, 50, 20);
  noStroke();
  fill(219, 112, 147);
  textSize(22);
  text(feedback, width/2, 620);

  // 手勢偵測
  detectGesture();

  // 畫手部關鍵點
  drawHandKeypoints();
}

function detectGesture() {
  if (predictions.length > 0) {
    let landmarks = predictions[0].landmarks;

    // 取得大拇指指尖(4)、食指指尖(8)、手腕(0)
    let thumbTip = landmarks[4];
    let indexTip = landmarks[8];
    let wrist = landmarks[0];

    // 判斷大拇指朝上或朝下
    // 若大拇指在手腕上方（y座標較小），且與食指距離遠，視為「比讚」
    // 若大拇指在手腕下方（y座標較大），且與食指距離遠，視為「比倒讚」
    let gesture = "";
    let d = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
    if (d > 60) { // 手張開才判斷
      if (thumbTip[1] < wrist[1] - 30) {
        gesture = "like";
      } else if (thumbTip[1] > wrist[1] + 30) {
        gesture = "dislike";
      }
    }

    // 顯示偵測到的手勢
    if (gesture === "like") {
      fill(0,200,0); text("👍", width/2-200, 100, 100,100);
      if (lastGesture !== "like") {
        checkAnswer(true);
        lastGesture = "like";
      }
    } else if (gesture === "dislike") {
      fill(200,0,0); text("👎", width/2+200, 100, 100,100);
      if (lastGesture !== "dislike") {
        checkAnswer(false);
        lastGesture = "dislike";
      }
    } else {
      lastGesture = "";
    }
  }
}

function drawHandKeypoints() {
  for (let i = 0; i < predictions.length; i++) {
    let landmarks = predictions[i].landmarks;
    for (let j = 0; j < landmarks.length; j++) {
      let [x, y] = landmarks[j];
      // 轉換到畫面座標
      x = width - ((width-640)/2 + x);
      y = 40 + y;
      fill(255, 0, 0);
      noStroke();
      ellipse(x, y, 10, 10);
    }
  }
}

function checkAnswer(ans) {
  if (gameOver) return;
  if (questions[current].answer === ans) {
    feedback = "答對了！";
    score++;
  } else {
    feedback = "答錯了！";
  }
  current++;
  if (current >= questions.length) {
    gameOver = true;
  }
}

function keyPressed() {
  if (gameOver && (key === 'r' || key === 'R')) {
    current = 0;
    score = 0;
    feedback = "";
    gameOver = false;
  }
}