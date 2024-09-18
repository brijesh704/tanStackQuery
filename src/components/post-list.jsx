import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPosts, fetchTags, addPost, deletePost } from "../api/api";
import debounce from "lodash/debounce";

function PostList() {
  const [page, setPage] = useState(1);

  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const queryClient = useQueryClient();

  const {
    data: postData,
    isError,
    error,
    isLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["posts", { page }],
    queryFn: () => fetchPosts(page),

    staleTime: 1000 * 60 * 5,
  });

  const { data: tagsData, isLoading: isTagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    // 👇 Since this wont change we dont want to refetch it
    staleTime: Infinity,
  });

  const {
    mutate,
    isPending,
    isError: isPostError,
    reset,
  } = useMutation({
    mutationFn: addPost,

    retry: 3,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"], exact: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["posts", { page }],
      });
    },
  });

  useEffect(() => {
    if (postData) {
      let filtered = postData.data;
      console.log(filtered, "filtered ");

      if (searchText) {
        filtered = filtered?.filter((post) =>
          post.title.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      setFilteredPosts(filtered);
      setPage(1);
    }
  }, [searchText]);

  const { mutate: deleteMutate, isPending: isDeletePending } = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries(["posts", { page }]);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts", { page }] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get("title");
    const tags = Array.from(formData.keys()).filter(
      (key) => formData.get(key) === "on"
    );

    if (!title || !tags) return;

    mutate({ id: postData?.items + 1, title, tags });

    e.target.reset();
  };

  const handleDelete = (id) => {
    console.log(id, "here is id");

    deleteMutate({ id });
  };

  const handleInputChange = (e) => {
    let text = e.target.value;

    console.log(text);
    setSearchText(text);
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        {isPostError && <h5 onClick={() => reset()}>Unable to Post</h5>}
        <input
          type="text"
          placeholder="Search by title..."
          value={searchText}
          onChange={handleInputChange}
          className="search-input"
        />
        <input
          type="text"
          placeholder="Enter your post.."
          className="postbox"
          name="title"
        />
        <div className="tags">
          {tagsData?.map((tag) => {
            return (
              <div key={tag}>
                <input type="checkbox" name={tag} id={tag} />
                <label htmlFor={tag}>{tag}</label>
              </div>
            );
          })}
        </div>
        <button disabled={isPending}>
          {isPending ? "Posting..." : "Post"}
        </button>
      </form>

      {/* post Data */}
      {isLoading && isTagsLoading && <p>Loading...</p>}
      {isError && <p>{error?.message}</p>}
      {(filteredPosts.length > 0 ? filteredPosts : postData?.data)?.map(
        (post) => (
          <div key={post.id} className="post">
            <div>{post.title}</div>
            {post.tags.map((tag) => {
              return <span key={tag}>{tag}</span>;
            })}
            <div className="btndlt">
              <button onClick={() => handleDelete(post.id)}>
                {isDeletePending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )
      )}

      {/* Pagination */}
      <div className="pages">
        <button
          onClick={() => setPage((old) => Math.max(old - 1, 0))}
          disabled={!postData?.prev}
        >
          Previous Page
        </button>
        <span>{page}</span>
        <button
          onClick={() => {
            if (!isPlaceholderData && postData?.next) {
              setPage((old) => old + 1);
            }
          }}
          // Disable the Next Page button until we know a next page is available
          disabled={isPlaceholderData || !postData?.next}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default PostList;
