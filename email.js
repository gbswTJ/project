const Emailer = (number) =>{
  return(
    `<div style="
    display: flex;
    justify-content: center; 
    align-items: center;
    width: 100vw;
    height: 100vh;
    flex-wrap: nowrap;
    ">
    <div>
      <h1 style="text-align: center;">NULL</h1>
    <div style="
    width: 200px;
    height: 30px;
    border: 1px solid black;
    background-color: silver;
    padding: 10px;
    text-align: center;
  "><label >인증번호:</label>
  <label style="
  color: white;
  font-size: 20px;
  font-weight: 550px;
  ">${number}</label></div>
    </div>
    </div>`
  )
}

module.exports = {Emailer}