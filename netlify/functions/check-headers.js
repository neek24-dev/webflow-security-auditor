exports.handler = async (event) => {
    try {
      const { url } = JSON.parse(event.body);
      if (!url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'URL is required' })
        };
      }
  
      const response = await fetch(url, { method: 'HEAD' });
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name.toLowerCase()] = value;
      });
  
      return {
        statusCode: 200,
        body: JSON.stringify(headers)
      };
    } catch (error) {
      console.error('Error fetching headers:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch headers' })
      };
    }
  };