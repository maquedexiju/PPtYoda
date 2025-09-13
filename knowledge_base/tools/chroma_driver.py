import chromadb
import json
import os
from typing import List, Dict, Any, Optional, Union

from django.conf import settings

class Chroma_Driver:
    def __init__(self, db_path: str = './chroma_db', collection_name: str = "default_collection"):
        """
        初始化 Chroma 向量数据库驱动

        Args:
            db_path: 数据库存储路径
            collection_name: 集合名称，默认为 "default_collection"
        """
        self.db_path = db_path
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self._initialize_db()

    def _initialize_db(self) -> None:
        """初始化数据库连接和集合"""
        # 确保目录存在
        os.makedirs(self.db_path, exist_ok=True)

        # 创建客户端
        self.client = chromadb.PersistentClient(
            path=self.db_path,
        )

        # 获取或创建集合
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=settings.CHROMA_EMBEDDING_FUNCTION,
            metadata={"hnsw:space": "cosine"}
        )

    def insert(self, documents: List[str], metadatas: Optional[List[Dict[str, Any]]] = None,
               ids: Optional[List[str]] = None) -> List[str]:
        """
        插入文档到向量数据库

        Args:
            documents: 文档列表
            metadatas: 元数据列表，可选
            ids: 文档 ID 列表，可选

        Returns:
            插入的文档 ID 列表
        """
        if ids is None:
            # 生成随机 ID
            import uuid
            ids = [str(uuid.uuid4()) for _ in documents]

        self.collection.add(
            documents=documents,
            metadatas=metadatas if metadatas else None,
            ids=ids
        )
        return ids

    def update_or_add_document(self, ids: List[str], documents: Optional[List[str]] = None,
               metadatas: Optional[List[Dict[str, Any]]] = None) -> None:
        """
        更新或添加文档到向量数据库

        Args:
            ids: 要更新的文档 ID 列表
            documents: 新的文档内容列表，可选
            metadatas: 新的元数据列表，可选
        """
        # ids 转成 str list
        ids = [str(id) for id in ids]

        # 检查文档是否存在
        existing_ids = self.collection.get(ids=ids)["ids"]
        if existing_ids:
            # 更新现有文档
            self.collection.update(
                ids=ids,
                documents=documents if documents else None,
                metadatas=metadatas if metadatas else None
            )
        else:
            # 添加新文档
            self.collection.add(
                ids=ids,
                documents=documents if documents else None,
                metadatas=metadatas if metadatas else None
            )

    def delete(self, ids: Optional[List[str]] = None,
               where: Optional[Dict[str, Any]] = None) -> None:
        """
        删除数据库中的文档

        Args:
            ids: 要删除的文档 ID 列表，可选
            where: 条件筛选，可选
        """
        # ids 转成 str list
        ids = [str(id) for id in ids]
        
        self.collection.delete(
            ids=ids,
            where=where
        )

    def query(self, query_text: str, n_results: int = 5,
              where: Optional[Dict[str, Any]] = None,
              include: List[str] = ["documents", "metadatas", "distances"]) -> Dict[str, Any]:
        f"""
        查询相似文档

        Args:
            query_texts: 查询文本列表
            n_results: 返回结果数量，默认为 5
            where: 条件筛选，可选
            include: 包含的字段，默认为 ["documents", "metadatas", "distances"]

        Returns:
            查询结果
            dict(
                'ids': list,
                'metadatas': list(dict),
                'documents': list(str),
                'distances': list(float),
            )
            
        """
        result = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where,
            include=include
        )
        # 转换 id 为 int
        try:
            ids = [int(id) for id in result['ids'][0]]
        except:
            ids = result['ids'][0]
        result_one = {
            'ids': ids,
            'metadatas': result['metadatas'][0],
            'documents': result['documents'][0],
            'distances': result['distances'][0], # 数值越大，相似度越低
        }
        return result_one

    def get(self, ids: Optional[List[str]] = None,
            where: Optional[Dict[str, Any]] = None,
            include: List[str] = ["documents", "metadatas"]) -> Dict[str, Any]:
        """
        获取文档

        Args:
            ids: 文档 ID 列表，可选
            where: 条件筛选，可选
            include: 包含的字段，默认为 ["documents", "metadatas"]

        Returns:
            获取的文档结果
        """
        # ids 转成 str list
        ids = [str(id) for id in ids]

        # 转换 id 为 int
        result = self.collection.get(
            ids=ids,
            where=where,
            include=include
        )
        # 转换 id 为 int
        try:
            result['ids'] = [int(id) for id in result['ids']]
        except:
            pass

        return result


    def export(self, output_path: str, format: str = "json") -> None:
        """
        导出数据库内容

        Args:
            output_path: 导出路径
            format: 导出格式，目前仅支持 json
        """
        if format != "json":
            raise NotImplementedError("目前仅支持 JSON 格式导出")

        # 获取所有文档
        all_docs = self.get()

        # 准备导出数据
        export_data = []
        for i, id in enumerate(all_docs["ids"]):
            doc_data = {
                "id": id,
                "document": all_docs["documents"][i] if "documents" in all_docs else None,
                "metadata": all_docs["metadatas"][i] if "metadatas" in all_docs else None
            }
            export_data.append(doc_data)

        # 导出到文件
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

    def count(self) -> int:
        """
        获取集合中文档数量

        Returns:
            文档数量
        """
        return self.collection.count()

    def reset(self) -> None:
        """
        重置集合（删除所有文档）"""
        self.client.delete_collection(self.collection_name)
        self._initialize_db()


if __name__ == "__main__":
    # 示例用法
    db_path = "./chroma_db"
    driver = Chroma_Driver(db_path, "test_collection")

    # 插入示例数据
    ids = driver.insert(
        documents=[
            "产品介绍",
            "行业洞察——消防健康",
            "市场分析——智慧教育"
        ],
        metadatas=[
            {"category": "example", "number": 1},
            {"category": "example", "number": 2},
            {"category": "example", "number": 3}
        ]
    )
    # print(f"插入的文档 ID: {ids}")

    # 查询相似文档
    for q in [
        '智慧消防',
        '行业洞察',
        '智慧教育',
        '行业洞察',
        '产品介绍'
    ]:
        results = driver.query(query_texts=[q])
        print(f"查询结果: {q}")
        for i, doc in enumerate(results["documents"][0]):
            print('======')
            print(f"文档 {i+1}: {doc}")
            print(f"相似度: {results['distances'][0][i]}")
            print(f"元数据: {results['metadatas'][0][i]}")
        print()

    # # 更新文档
    # driver.update(
    #     ids=[ids[0]],
    #     documents=["这是更新后的第一个文档"],
    #     metadatas=[{"category": "example", "number": 1, "updated": True}]
    # )
    # print("更新后的第一个文档:")
    # updated_docs = driver.get(ids=[ids[0]])
    # print(updated_docs)

    # # 导出数据
    # export_path = "./exported_data.json"
    # driver.export(export_path)
    # print(f"数据已导出到 {export_path}")

    # # 文档数量
    # print(f"集合中文档数量: {driver.count()}")

    # 删除文档
    driver.delete(ids=[ids[1]])
    print(f"删除一个文档后的数量: {driver.count()}")

    # 重置集合
    driver.reset()
    print(f"重置后的文档数量: {driver.count()}")