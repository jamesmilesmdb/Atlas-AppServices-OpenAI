exports = async function(changeEvent){
  
  // ========== DEFINE CONTEXT ========== //
  
  const mongodb = context.services.get("mongodb-atlas");
  const vehicleExample = mongodb.db("JLR").collection("VehicleExample");
  
  // ========== HANDLE CHANGE EVENT ========== //
  
  // Handle changeEvent
  const { fullDocument } = changeEvent;
  const { _id } = fullDocument;
  
  const vehicle = await vehicleExample.findOne({ _id: _id });
  // const responseObject = EJSON.parse(vehicle.body.text());
  console.log(vehicle.brand);
  
  // ========== ACCESS OPENAI API ========== //
  
  // Atlas stores secure environment variables within Atlas App Services
  const bearerToken = context.environment.values.OPENAI_TOKEN;
  
  // Define the payload for OpenAI
  const payload = {
      model: "text-curie-001",
      temperature: 0,
      max_tokens: 100,
      prompt: `
        Create a short summary of the following vehicle: ${vehicle.brand} ${vehicle.model}.
      `
  };
  const requestBody = JSON.stringify(payload);
  
  // Use the built-in Atlas context module for accessing 3rd-party API calls, 
  // as well as internal MongoDB services
  const response = await context.http.post({
    url: "https://api.openai.com/v1/completions",
    headers: {
      "Content-Type": ["application/json"],
      "Authorization": [bearerToken]
    },
    body: requestBody
  })
  
  // App Services works with Extended JSON (EJSON) to correctly handle types
  const responseObject      = EJSON.parse(response.body.text());
  const returnValue         = responseObject.choices[0].text
  const decodedReturnValue  = returnValue.replace('\n\n','').trim();
  
  // Log the parsed output to console for testing
  console.log(decodedReturnValue);
  
  // ========== UPDATE CHANGE TO DOCUMENT ========== //
  const query = { _id: _id };
  const update = {
    $set: {
      "describedByAI": decodedReturnValue,
      "updatedByAI": true
    }
  };
  const options = { "upsert": true };
  
  const vehicleUpdate = await vehicleExample.updateOne(query, update, options);
  // Verify update in logs
  console.log(vehicleUpdate);

};
