import axios from "axios";

const getveevaData = () => { 
   
    let sessionUrl = "  http://127.0.0.1:8000/list_approved_documents";

    // let sessionUrl = "  http://19kadvwq6mj.execute-api.us-east-1.amazonaws.com/list_approved_documents";
    // let sessionUrl = properties.GP_BASE_URL + 'Componentconfig/'+ upload_id;
    //console.log(sessionUrl);
    return axios.get(sessionUrl,{}
    )
    // .then(response => {
    //   // Handle successful response
    //   console.log(response.data, response.status);
    // })
    .catch(function (error) {
      console.log("Error in getting veeva Data");
      console.log(error)
    });
  }

  export { getveevaData }