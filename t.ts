Bun.serve({
    port: 3000,
    error: (error) => {
        console.error("Error:", error);
    },
    routes: {
        "/user": function () {
            return Response.json({ "name": "jonathan", "age": "40" })
        }
    }
});


console.log("Server is running on http://localhost:3000/user");
