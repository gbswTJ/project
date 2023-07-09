const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
require("dotenv").config();
const {Emailer} = require('./email');
const db = require("./config/db");

//미들웨어 등록
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

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

app.use(express.static(path.join(__dirname, 'build')));



app.get("/api/board", async(req,res)=>{
  const boardlist = await db.select("id","title","user_id",
                            "created_at","updated_at",
                            "username","good")
                            .from("posts");
  return res.json({
    success: true,
    message: "조회성공",
    data: boardlist
  })
})

app.get("/api/board/popular", async(req,res) =>{
  const popular = await db
  .select("posts.id", "posts.image", "posts.title", "posts.updated_at", "users.username")
  .from("posts")
  .join("users", "posts.user_id", "=", "users.id")
  .orderBy("posts.good", "desc")
  .limit(10);


  return res.json({
    success: true,
    message: '조회성공',
    data: popular
  });
});

app.get("/api/board/latest", async(req,res)=>{
  const created_at = await db
  .select("posts.id", "posts.image", "posts.title", "posts.updated_at", "users.username")
  .from("posts")
  .join("users", "posts.user_id", "=", "users.id")
  .orderBy("posts.created_at", "desc")
  .limit(10);

  return res.json({
    success: true,
    message: "조회성공",
    data: created_at
  })
})

app.get("/api/board/myContents", async(req, res)=>{
  req.session.isLogin = req.query.isLogin;
  try{
    const my = await db
    .select("id","image","title","username","updated_at")
    .from("posts")
    .where("user_id","=",req.session.isLogin)
    .orderBy('created_at', 'desc')
    .limit(12);

    return res.json({
      success: true,
      message: "작성성공",
      data: my
    })
  }catch(e){
    console.log(e);
    return res.json({
      success: false,
      message: "작성실패"
    })
  }
})
app.post("/api/board/detail", async (req,res) =>{
  const user_id = req.body.id
  const board_id = req.body.board_id;
  const tag = await db
  .select('name')
  .from("post_tags as p")
  .innerJoin('tags as t', 't.id', 'p.tag_id')
  .where('p.post_id',board_id)
  .orderBy('t.id', 'asc');

  const board_user_id = await db.select("username").from("users").where("id", user_id);
  return res.json({
    success: true,
    message: "조회성공",
    ids: board_user_id[0].username,
    tag: tag
  })
});
app.post("/api/board/isLike", async (req, res) => {
  if(req.body.isLogin){
    const isLike = await db.select("id").from("likes").where("user_id",req.body.isLogin).andWhere("post_id",req.body.board_id);
    return res.json({
      success: true,
      message: "불러오기 성공",
      likes: isLike[0] ? true : false
    });
  }
});

app.get("/api/board/:id", async (req, res) => {
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

app.post("/api/board/write", async (req, res) => {
  req.session.isLogin = req.body.isLogin;
  req.session.username = req.body.username;
  if (req.session.isLogin) {
    try {
      const { title, content, image, tags, posts_option } = req.body;

      if (!title || !content) {
        return res.json({
          success: false,
          message: '제목 또는 내용이 누락되었습니다.'
        });
      }

      const existingTags = await db.select('name').from('tags').whereIn('name', tags);
      const existingTagNames = existingTags.map(tag => tag.name);

      const newTags = tags.filter(tag => !existingTagNames.includes(tag));

      if (newTags.length > 0) {
        await db.insert(newTags.map(name => ({ name }))).into('tags');
      }

      const postTags = await db.select('id', 'name').from('tags').whereIn('name', tags);

      const postId = await db.insert({
        title: title,
        content: content,
        image: image,
        user_id: req.session.isLogin,
        username: req.session.username,
        posts_option: posts_option
      }).into('posts');


      const postTagData = postTags.map(tag => ({
        tag_id: tag.id,
        post_id: postId
      }));
      
      await db.insert(postTagData).into('post_tags');
      

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
  } else {
    return res.json({
      success: false,
      message: '로그인후 이용가능합니다.'
    });
  }
});


app.post("/api/board/update", async (req, res) => {
  req.session.isLogin = req.body.isLogin;
  req.session.boardID = req.body.boardID;

  if (req.session.isLogin) {
    try {
      if (req.body.give) {
        const data = await db
          .select()
          .from("posts")
          .where("user_id", "=", req.session.isLogin)
          .andWhere("id", "=", req.session.boardID);

        const tag = await db
          .select('name')
          .from("post_tags as p")
          .innerJoin('tags as t', 't.id', 'p.tag_id')
          .where('p.post_id', req.session.boardID)
          .orderBy('t.id', 'asc');
        const tagNames = tag.map(tag => tag.name);

        if (data[0]) {
          return res.json({
            success: true,
            message: "값 가져오기 성공",
            data,
            tagNames
          });
        }

        return res.json({
          success: false,
          message: "없음"
        });

      } else {
        req.session.boardID = req.body.boardID;
        const { title, content, image, tags, posts_option } = req.body;

        if (!title || !content || content === "<p><br></p>" || content === "<p></p>") {
          return res.json({
            success: false,
            message: '제목 또는 내용이 누락되었습니다.'
          });
        }

        await db
          .select()
          .from('posts')
          .where('id', '=', req.session.boardID)
          .update({
            title: title,
            content: content,
            image: image,
            posts_option
          });

        // 태그 업데이트 로직 시작
        const currentTags = await db
          .select('name')
          .from('tags')
          .whereIn('name', tags);

        const existingTagNames = currentTags.map(tag => tag.name);
        const addedTags = tags.filter(tag => !existingTagNames.includes(tag));
        const removedTags = existingTagNames.filter(tag => !tags.includes(tag));

        await Promise.all(
          addedTags.map(async tag => {
            const [tagId] = await db('tags').insert({ name: tag });
            await db('post_tags').insert({ post_id: req.session.boardID, tag_id: tagId });
          })
        );

        await db('post_tags')
          .whereIn('tag_id', function () {
            this.select('id')
              .from('tags')
              .whereIn('name', removedTags);
          })
          .where('post_id', req.session.boardID)
          .del();
        // 태그 업데이트 로직 종료

        return res.json({
          success: true,
          message: '작성완료'
        });
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    return res.json({
      success: false,
      message: '로그인후 이용가능합니다.'
    });
  }
});


app.post("/api/board/delete", async (req,res) =>{
  const BoardID = req.body.BoardID;
  try{
    if(BoardID){
      await db.delete().from('posts').where('id','=',BoardID)
      return res.json({
        success: true,
        message: '삭제되었습니다'
      });
    }
    return res.json({
      success: false,
      message: '실패했습니다'
    });

  }catch(e){
    console.error(e);
  }
})


app.post("/api/board/good", async (req,res) => {
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

app.post("/api/email", async(req,res)=>{
  let rand = "";
  for(let i = 0; i < 6; ++i){
    const a = Math.floor(Math.random() * 10);
  
    rand += `${a}`;
  };
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'nullproject2023@gmail.com', 
      pass: 'bdqfrcwsxkaasxfo'
    }
  });
  const mailOptions = {
    from: 'nullproject2023@gmail.com',
    to: `${req.body.email}`,
    subject: '이메일 인증번호 발송',
    html: Emailer(rand)
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      return res.json({
        success: true,
        message: "이메일이 성공적으로 전송되었습니다.",
        email: rand
      });
    }
  });
  
})


app.post("/api/register",async(req,res) => {
  const username = req.body.id;
  const password = req.body.pw;
  const name = req.body.name;
  const email = req.body.email;
  const chkID = await db.select("*").from("users").where("username", username);

  if(chkID.length == 0){
    await db.insert({username,password,name,email}).into('users');
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

app.post("/api/login", async(req,res)=>{
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

app.post("/api/profile", async(req,res)=>{
  if(req.body.userid){
    const userid = req.body.userid;
  const userprofile = await db.select("name","email").from("users").where("id",userid);
  return res.json({
    success: true,
    message: '조회성공',
    profileName: userprofile[0].name,
    profileEmail: userprofile[0].email
  })
  }else{
    return res.json({
      success:false,
      message:"로그인먼저해주세요"
    })
  }
})

app.post("/api/logout", async(req,res)=>{
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

app.post('/api/comment/take', async(req,res) => {
  const id = req.body.id;
   const comments = await db.select('*')
   .from('users as u')
   .innerJoin('comments as c', 'u.id', 'c.user_id')
   .where('post_id', id)
   .orderBy('c.created_at', 'asc');

  const writeUsername = await db.select("u.username")
  .from('users as u')
  .innerJoin('posts as p', 'u.id', 'p.user_id')
  .where('p.id',id)

   return res.json({
    success: true,
    message: "완료",
    comments: comments,
    writeUsername: writeUsername[0].username
   })
})

app.post('/api/comment/write', async(req,res) => {
  const {user_id, content, post_id} = req.body;

  if(content.length==0){
    return res.json({
      success : false,
      message : '내용이 없습니다.'
    });
  }

  await db('comments').insert({
    'content':content,
    'user_id':user_id,
    'post_id':post_id
  });
  return res.json({
    success : true,
    message : '작성완료'
  });
});

app.post('/api/comment/update', async(req,res) => {
  const {content, id} = req.body;
  if(content.length==0){
    return res.json({
      success : false,
      message : '내용이 없습니다.'
    });
  }
  await db('comments').update({'content':content}).where('id',id);
  return res.json({
    success : true,
    message : '수정완료'
  });
});

app.post('/api/comment/delete', async(req,res) => {
  const id = req.body.id;
  await db('comments').del().where('id',id);
  return res.json({
    success : true,
    message : '삭제완료'
  });
});

// search
app.post('/api/searchHistory/show', async(req,res) => {
  const id = req.body.id;

  const searchHistory = await db.select('contents').from('searchhistory').where('id', id).orderBy('searchTime', 'desc');;

  if(searchHistory.length==0){
    return res.json({
      success : false,
      message : "검색기록 없음",
    });
  }

  return res.json({
    success : true,
    message : "조회완료",
    data: searchHistory
  });
});

app.post('/api/searchHistory/insert', async(req,res) => {
  const {id, contents} = req.body;

  const duplication = await db.select('*').from('searchhistory').where('id', id).andWhere('contents', contents);
  const accumulate = await db.select('*').from('searchhistory').where('id', id).orderBy('searchTime', 'asc');

  if(duplication.length!=0){
    return res.json({
      success : false,
      message : "이미 있는 검색기록입니다."
    });
  }

  if(accumulate.length==5){
    const earliestRow = accumulate[0];
    await db('searchhistory').where('contents', earliestRow.contents).del();
  }

  await db('searchhistory').insert({
      'id': id,
      'contents': contents,
      'searchtime': db.raw('DEFAULT')
  });
  return res.json({
    success : true,
    message : "입력되었습니다."
  })
});

app.post('/api/searchHistory/delete', async(req, res) => {
  const {id, contents} = req.body;

  await db('searchhistory').where('id', id).andWhere('contents', contents).del();
  return res.json({
    success : true,
    message : "삭제되었습니다."
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/index.html'));
});

module.exports = app;