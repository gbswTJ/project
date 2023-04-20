const express = require("express");
const app = express();
const knex = require("knex");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PORT = 8000;
//const { encrypt, decrypt } = require('./encryption');


//미들웨어 등록
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
let corsOptions = {
  origin: "*",
  Credential: true,
};
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(session({
  secret: 'mykeySecret1014',
  resave: false,
  saveUninitialized: true
}));

// app.use(session({
//   secret: 'myselectkeyboard1234567898765432',
//   resave: false,
//   saveUninitialized: true,
  
// }));


const db = knex({
  client: 'mysql',
  connection: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'cksals1014',
    database: 'board',
    pool: {
      min: 0,
      max: 10
    },
    acquireConnectionTimeout: 10000
  },
  useNullAsDefault: true
});


app.get("/",(req,res)=>{
  res.send("test");
});

app.get("/board", async(req,res)=>{
  const boardlist = await db.select("*").from("posts");
  return res.json({
    success: true,
    message: "조회성공",
    data: boardlist
  })
})

app.get("/board/:id", async (req, res) => {
  const board = await db
    .select()
    .from("posts")
    .where("id", req.params.id)
    .first(); 
    return res.json({
    success: true,
    message: "조회성공",
    data: board,
  });
});

app.post("/board/write", async (req, res) => {
  req.session.isLogin = req.body.isLogin;
  req.session.username = req.body.username;
  if(req.session.isLogin){
    try {
      const { title, content, image_url } = req.body;
      if (!title || !content) {
        return res.json({
          success: false,
          message: '제목 또는 내용이 누락되었습니다.'
        });
      }

      await db.insert({
        title: title,
        content: content,
        image_url: image_url,
        user_id: req.session.isLogin,
        username: req.session.username
      }).into('posts');

      return res.json({
        success: true,
        message: '작성완료'
      });
    } catch (e) {
      console.error(e);
      return res.json({
        success: false,
        message: '작성실패'
      });
    }
  }else{
    return res.json({
      success: false,
      message: '로그인후 이용가능합니다.'
    });
  }
});

app.post("/board/update", async( req, res) =>{
  req.session.isLogin = req.body.isLogin;
  req.session.boardID = req.body.boardID;
  if(req.session.isLogin){
    try{
      if(req.body.give){
        const data =
        await db.select()
              .from("posts")
              .where("user_id", "=",req.session.isLogin)
              .andWhere("id", "=", req.session.boardID)
      if(data[0]){
        return res.json({
          success: true,
          message: "값 가져오기 성공",
          data,
        })
      }
      
      return res.json({
        success: false,
        message: "없음"
      })

      }else{
        
        const { title, content, image_url } = req.body;
        if (!title || !content) {
          return res.json({
            success: false,
            message: '제목 또는 내용이 누락되었습니다.'
          });
        }
        
        await db.update('posts').set({
          title: title,
          content: content,
          image_url: image_url,
        }).where('id','=',req.session.boardID);
        console.log(1)
        return res.json({
          success: true,
          message: '작성완료'
        });

    }
    }catch{
      
    }
  }else{
    return res.json({
      success: false,
      message: '로그인후 이용가능합니다.'
    });
  }
});

app.post("/board/good", async (req,res) => {
  try{
    req.session.userid = req.body.userid;
    const post_id = req.body.id;
    const user_id = req.session.userid;
    if(req.session.userid){
      const like = await db.select("post_id").from("likes").where("user_id","=",user_id).andWhere("post_id","=",post_id);
      if(!like.length){
        
        await db.insert({
          post_id,
          user_id
        }).into('likes');

        await db('posts').where({ id: post_id }).increment('good', 1);

        return res.json({
          success: true,
          message: '좋아요 성공'
        });
      }else{
        await db.delete().from('likes').where("post_id","=",post_id).andWhere("user_id","=",user_id);
        await db('posts').where({ id: post_id }).decrement('good', 1)
        
        return res.json({
          success: true,
          message: '좋아요 취소 성공'
        });
      }
      
    }else{
      return res.json({
        success: false,
        message: '로그인후 이용가능합니다.'
      });
    }
  }catch(e){
    return res.json({
      success: false,
      message: e
    });
  }
});

app.post("/register",async(req,res)=>{
  const username = req.body.id;
  const password = req.body.pw;
  const name = req.body.name;
  

  const chkID = await db.select("*").from("users").where("username", username);

  if(chkID.length == 0){
    await db.insert({username,password,name}).into('users');
    return res.json({
      success: true,
      message: "회원가입이 완료되었습니다."
    });
  }
  return res.json({
    success:  false,
    message: "id가 같습니다"
  });
});

app.post("/login", async(req,res)=>{
  const username = req.body.id;
  const pw = req.body.pw;
  const dbs =  await db.select("*").from("users").where("username", username);
  if(dbs.length == 0 || dbs[0].password != pw) {
    return res.json({ success: false, message: "잘못된 정보입니다" });
  }
  req.session.isLogin = dbs[0].id;
  req.session.username = username;
  req.session.save();
  return res.json({success: true, message: "로그인 성공", token: req.session.username, isLogin: req.session.isLogin})
})

app.post("/logout", async(req,res)=>{
  try{
    req.session.destroy();

    return res.json({
      success: true,
      message: "로그아웃 성공"
    });
  }catch{
    return res.json({
      success: false,
      message: "로그아웃 실패"
    });
  }
});

app.listen(PORT,()=>{
  console.log(123);
})