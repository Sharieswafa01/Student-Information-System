<?php
// save.php
// Receive raw XML in request body and overwrite students.xml (local dev only).
$data = file_get_contents('php://input');
if (!$data) {
  http_response_code(400);
  echo "No data received";
  exit;
}
file_put_contents('students.xml', $data);
echo "OK";
