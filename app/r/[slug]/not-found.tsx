export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">방을 찾을 수 없습니다</h1>
        <p className="text-muted-foreground mt-2">
          찾으시는 방이 존재하지 않거나 삭제되었습니다.
        </p>
      </div>
    </div>
  );
}
