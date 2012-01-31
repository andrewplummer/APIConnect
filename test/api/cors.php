<?php

$headers = apache_request_headers();
$origin = $headers['Origin'];

// Must set the EXACT origin to use withCredentials. "*" is not enough.
header("Access-Control-Allow-Origin: " . ($origin ? $origin : "*"));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Max-Age: 1728000");
header("Content-Type: application/json");

?>
